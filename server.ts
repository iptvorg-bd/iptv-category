import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const DEFAULT_CATEGORIES = [
  { id: "sports", name: "Sports", url: "https://iptv-org.github.io/iptv/categories/sports.m3u" },
  { id: "movies", name: "Movies", url: "https://iptv-org.github.io/iptv/categories/movies.m3u" },
  { id: "documentary", name: "Documentary", url: "https://iptv-org.github.io/iptv/categories/documentary.m3u" },
  { id: "kids", name: "Kids", url: "https://iptv-org.github.io/iptv/categories/kids.m3u" },
  { id: "entertainment", name: "Entertainment", url: "https://iptv-org.github.io/iptv/categories/entertainment.m3u" },
  { id: "music", name: "Music", url: "https://iptv-org.github.io/iptv/categories/music.m3u" }
];

export interface ChannelItem {
  id: string;
  name: string;
  logo: string;
  group: string;
  category: string;
  tvgId: string;
  url: string;
  rawExtInf?: string;
  status?: "working" | "dead" | "checking" | "unchecked";
  checkLatencyMs?: number;
  httpCode?: number;
}

function parseM3uContent(m3uText: string, categoryName: string): ChannelItem[] {
  const lines = m3uText.split(/\r?\n/);
  const channels: ChannelItem[] = [];
  let currentExtInf = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      currentExtInf = line;
    } else if (!line.startsWith("#")) {
      if (currentExtInf && (line.startsWith("http://") || line.startsWith("https://"))) {
        // Extract channel info from currentExtInf
        const nameMatch = currentExtInf.match(/,(.*)$/);
        const name = nameMatch ? nameMatch[1].trim() : "Unknown Channel";

        const logoMatch = currentExtInf.match(/tvg-logo="([^"]*)"/);
        const logo = logoMatch ? logoMatch[1] : "";

        const groupMatch = currentExtInf.match(/group-title="([^"]*)"/);
        const group = groupMatch ? groupMatch[1] : categoryName;

        const tvgIdMatch = currentExtInf.match(/tvg-id="([^"]*)"/);
        const tvgId = tvgIdMatch ? tvgIdMatch[1] : "";

        channels.push({
          id: `${categoryName.toLowerCase()}-${channels.length + 1}-${Math.random().toString(36).substring(2, 7)}`,
          name,
          logo,
          group,
          category: categoryName,
          tvgId,
          url: line,
          rawExtInf: currentExtInf
        });
        currentExtInf = "";
      }
    }
  }

  return channels;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Endpoint to verify stream health for a batch of channels
  app.post("/api/verify-streams", async (req, res) => {
    const channels: ChannelItem[] = req.body.channels || [];
    if (!channels.length) {
      return res.json({ results: [] });
    }

    const checkStream = async (channel: ChannelItem) => {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout

        const response = await fetch(channel.url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-HealthChecker/1.0",
            Range: "bytes=0-1024" // fetch only first chunk to conserve bandwidth
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const isOk = response.ok || response.status === 206 || response.status === 302 || response.status === 301;

        return {
          ...channel,
          status: isOk ? ("working" as const) : ("dead" as const),
          checkLatencyMs: latency,
          httpCode: response.status
        };
      } catch (err: any) {
        return {
          ...channel,
          status: "dead" as const,
          checkLatencyMs: Date.now() - startTime,
          httpCode: 0
        };
      }
    };

    // Run checks concurrently up to 15 streams at a time
    const results = await Promise.all(channels.map(ch => checkStream(ch)));

    res.json({
      timestamp: new Date().toISOString(),
      totalChecked: results.length,
      workingCount: results.filter(r => r.status === "working").length,
      deadCount: results.filter(r => r.status === "dead").length,
      results
    });
  });

  // Proxy / fetch M3U playlist directly
  app.get("/api/fetch-m3u", async (req, res) => {
    const targetUrl = req.query.url as string;
    const category = (req.query.category as string) || "General";

    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Sync-Worker/1.0"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${targetUrl}: HTTP ${response.status}`);
      }

      const m3uText = await response.text();
      const channels = parseM3uContent(m3uText, category);

      res.json({
        url: targetUrl,
        category,
        totalChannels: channels.length,
        channels: channels.slice(0, 500), // return up to 500 channels for UI preview
        rawM3uLength: m3uText.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to download playlist" });
    }
  });

  // Sync all categories in one API call
  app.post("/api/sync-all", async (req, res) => {
    const categoriesToSync = req.body.categories || DEFAULT_CATEGORIES;
    const results: Record<string, { count: number; url: string; status: string; channels: ChannelItem[] }> = {};
    let totalChannels = 0;
    const allChannels: ChannelItem[] = [];

    for (const cat of categoriesToSync) {
      try {
        const resp = await fetch(cat.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-Sync-Worker/1.0"
          }
        });
        if (resp.ok) {
          const text = await resp.text();
          const channels = parseM3uContent(text, cat.name);
          results[cat.id] = {
            count: channels.length,
            url: cat.url,
            status: "success",
            channels: channels.slice(0, 100) // sample for UI
          };
          totalChannels += channels.length;
          allChannels.push(...channels);
        } else {
          results[cat.id] = {
            count: 0,
            url: cat.url,
            status: `Error ${resp.status}`,
            channels: []
          };
        }
      } catch (err: any) {
        results[cat.id] = {
          count: 0,
          url: cat.url,
          status: err.message || "Fetch failed",
          channels: []
        };
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      totalChannels,
      categories: results,
      allChannelsSample: allChannels.slice(0, 200)
    });
  });

  // Vite middleware for development vs static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
