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
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

        // IPTV streams work best with VLC or SmartTV user-agent
        const response = await fetch(channel.url, {
          method: "GET",
          headers: {
            "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
            "Accept": "*/*",
            Range: "bytes=0-2048" // fetch first 2KB chunk
          },
          redirect: "follow",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const statusCode = response.status;
        const contentType = (response.headers.get("content-type") || "").toLowerCase();

        // Must be successful HTTP status
        if (!response.ok && statusCode !== 206) {
          return {
            ...channel,
            status: "dead" as const,
            checkLatencyMs: latency,
            httpCode: statusCode
          };
        }

        // Read first chunk text to detect HTML pages, shorteners, 404s, or invalid playlist
        const chunkText = await response.text().catch(() => "");
        const lowerChunk = chunkText.toLowerCase();

        // 1. If content is HTML / shortener / error web page -> DEAD
        if (
          contentType.includes("text/html") ||
          contentType.includes("application/xhtml") ||
          lowerChunk.includes("<!doctype html") ||
          lowerChunk.includes("<html") ||
          lowerChunk.includes("<head") ||
          lowerChunk.includes("404 not found") ||
          lowerChunk.includes("access denied") ||
          lowerChunk.includes("short.gy") ||
          lowerChunk.includes("jmp2.uk")
        ) {
          return {
            ...channel,
            status: "dead" as const,
            checkLatencyMs: latency,
            httpCode: statusCode
          };
        }

        // 2. If URL is .m3u8, verify it contains valid HLS tags
        const isHlsUrl = channel.url.toLowerCase().includes(".m3u8") || contentType.includes("mpegurl");
        if (isHlsUrl) {
          const isValidHls = lowerChunk.includes("#extm3u") || lowerChunk.includes("#ext-x-") || lowerChunk.includes(".ts") || lowerChunk.includes(".m3u8");
          if (!isValidHls) {
            return {
              ...channel,
              status: "dead" as const,
              checkLatencyMs: latency,
              httpCode: statusCode
            };
          }
        }

        // Valid working stream
        return {
          ...channel,
          status: "working" as const,
          checkLatencyMs: latency,
          httpCode: statusCode
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
