import { CategoryConfig } from "../types";

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: "sports",
    name: "Sports",
    url: "https://iptv-org.github.io/iptv/categories/sports.m3u",
    description: "Live Sports channels, Football, Cricket, Basketball, Racing, etc.",
    enabled: true
  },
  {
    id: "movies",
    name: "Movies",
    url: "https://iptv-org.github.io/iptv/categories/movies.m3u",
    description: "Movie channels, Cinema, Hollywood, Bollywood & regional films.",
    enabled: true
  },
  {
    id: "documentary",
    name: "Documentary",
    url: "https://iptv-org.github.io/iptv/categories/documentary.m3u",
    description: "Nature, Science, History, Discovery & Wildlife documentaries.",
    enabled: true
  },
  {
    id: "kids",
    name: "Kids",
    url: "https://iptv-org.github.io/iptv/categories/kids.m3u",
    description: "Cartoons, Animated movies, Kids learning & educational channels.",
    enabled: true
  },
  {
    id: "entertainment",
    name: "Entertainment",
    url: "https://iptv-org.github.io/iptv/categories/entertainment.m3u",
    description: "General TV shows, Drama series, Reality shows & Variety entertainment.",
    enabled: true
  },
  {
    id: "music",
    name: "Music",
    url: "https://iptv-org.github.io/iptv/categories/music.m3u",
    description: "Music video channels, Live concerts, Pop, Rock & Hits.",
    enabled: true
  }
];

export function generatePythonScript(categories: CategoryConfig[], outputDir = "playlists"): string {
  const activeCats = categories.filter(c => c.enabled);
  const catDictStr = activeCats
    .map(c => `    "${c.id}": {\n        "name": "${c.name}",\n        "url": "${c.url}"\n    }`)
    .join(",\n");

  return `# -*- coding: utf-8 -*-
"""
IPTV Category Auto-Updater & Stream Health Verifier
Developer: MD ANAMUL HOQUE
Telegram: https://t.me/ireentv
Website: https://anamul.pages.dev

Fetches M3U category playlists from iptv-org every 24 hours.
Verifies stream health (working vs dead), generates working_channels.m3u,
dead_channels.m3u, all_categories.m3u, and category-specific files.
"""

import os
import sys
import re
from datetime import datetime, timezone
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# Output folder where M3U files will be stored
OUTPUT_DIR = "${outputDir}"

# Target IPTV Categories and URLs
CATEGORIES = {
${catDictStr}
}

DEVELOPER_NAME = "MD ANAMUL HOQUE"
TELEGRAM_LINK = "https://t.me/ireentv"
WEBSITE_LINK = "https://anamul.pages.dev"
VERSION = "1.0"

def get_m3u_header(playlist_name, channels_amount, last_update):
    return (
        f"#EXTM3U\\n"
        f"# Playlist Name: {playlist_name}\\n"
        f"# Developer: {DEVELOPER_NAME}\\n"
        f"# Telegram: {TELEGRAM_LINK}\\n"
        f"# Website: {WEBSITE_LINK}\\n"
        f"# Version: {VERSION}\\n"
        f"# Channels Amount: {channels_amount}\\n"
        f"# Last Update: {last_update}\\n\\n"
    )

def ensure_directory_exists(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"📁 Created directory: {directory}")

def download_m3u(category_id, name, url):
    print(f"🔄 Downloading [{name}] from {url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-AutoSync-Worker/1.0'
    }
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            if response.status == 200:
                content = response.read().decode('utf-8', errors='ignore')
                print(f"✅ Successfully downloaded [{name}]. Size: {len(content)} bytes.")
                return content
            else:
                print(f"❌ Error downloading [{name}]: HTTP {response.status}")
                return None
    except Exception as e:
        print(f"⚠️ Exception downloading [{name}]: {e}")
        return None

def extract_channels_from_m3u(m3u_text, category_name):
    lines = m3u_text.splitlines()
    channels = []
    current_extinf = None
    
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
        if line_str.startswith('#EXTINF:'):
            current_extinf = line_str
        elif not line_str.startswith('#') and (line_str.startswith('http://') or line_str.startswith('https://')):
            if current_extinf:
                channels.append((current_extinf, line_str, category_name))
                current_extinf = None
    return channels

def test_single_stream(channel_tuple):
    extinf, url, cat = channel_tuple
    headers = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
        'Range': 'bytes=0-2048'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6) as response:
            status = response.status
            content_type = response.headers.get('Content-Type', '').lower()
            
            if status not in [200, 206]:
                return channel_tuple, False
                
            # Read first chunk
            chunk = response.read(2048)
            try:
                chunk_str = chunk.decode('utf-8', errors='ignore').lower()
            except Exception:
                chunk_str = ""

            # 1. HTML / shortener / web page detection
            if ('text/html' in content_type or 'xhtml' in content_type or
                '<!doctype html' in chunk_str or '<html' in chunk_str or
                '<head' in chunk_str or '404 not found' in chunk_str or
                'access denied' in chunk_str or 'short.gy' in chunk_str or
                'jmp2.uk' in chunk_str):
                return channel_tuple, False

            # 2. HLS Playlist validation
            is_hls = '.m3u8' in url.lower() or 'mpegurl' in content_type
            if is_hls:
                has_hls_header = ('#extm3u' in chunk_str or '#ext-x-' in chunk_str or
                                  '.ts' in chunk_str or '.m3u8' in chunk_str)
                if not has_hls_header:
                    return channel_tuple, False

            return channel_tuple, True
    except Exception:
        return channel_tuple, False

def verify_all_streams(channels_list, max_workers=20):
    print(f"🔍 Testing stream health for {len(channels_list)} channels (Timeout: 5s)...")
    working = []
    dead = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_channel = {executor.submit(test_single_stream, ch): ch for ch in channels_list}
        for future in as_completed(future_to_channel):
            ch_data, is_working = future.result()
            if is_working:
                working.append(ch_data)
            else:
                dead.append(ch_data)
                
    print(f"📊 Stream Check Results: {len(working)} Working, {len(dead)} Dead/Offline")
    return working, dead

def main():
    print("=" * 65)
    print("🚀 IPTV Auto-Sync & Stream Health Checker Started")
    print(f"👤 Developer: {DEVELOPER_NAME}")
    print(f"🔗 Telegram: {TELEGRAM_LINK}")
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"⏰ Execution Time: {now_utc}")
    print("=" * 65)

    ensure_directory_exists(OUTPUT_DIR)

    all_channels = []
    summary_report = []

    for cat_id, info in CATEGORIES.items():
        name = info["name"]
        url = info["url"]
        
        content = download_m3u(cat_id, name, url)
        
        if content:
            file_path = os.path.join(OUTPUT_DIR, f"{cat_id}.m3u")
            channels = extract_channels_from_m3u(content, name)
            all_channels.extend(channels)
            
            # Form header for category playlist
            header = get_m3u_header(f"{name} Playlist", len(channels), now_utc)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(header)
                for extinf, stream_url, _ in channels:
                    f.write(f"{extinf}\\n{stream_url}\\n")
                
            summary_report.append(f"  • {name} ({cat_id}.m3u): {len(channels)} channels")
            print(f"💾 Saved {file_path} ({len(channels)} channels)")
        else:
            summary_report.append(f"  • {name} ({cat_id}.m3u): ⚠️ FAILED TO DOWNLOAD")

    # 1. Save all_categories.m3u
    all_cat_file = os.path.join(OUTPUT_DIR, "all_categories.m3u")
    header_all = get_m3u_header("All Categories Combined Playlist", len(all_channels), now_utc)
    with open(all_cat_file, 'w', encoding='utf-8') as f:
        f.write(header_all)
        for extinf, stream_url, _ in all_channels:
            f.write(f"{extinf}\\n{stream_url}\\n")
    print(f"✅ Created Master Playlist: {all_cat_file} ({len(all_channels)} channels)")

    # 2. Verify streams to produce working_channels.m3u and dead_channels.m3u
    working_channels, dead_channels = verify_all_streams(all_channels)

    # Save working_channels.m3u
    working_file = os.path.join(OUTPUT_DIR, "working_channels.m3u")
    header_working = get_m3u_header("Verified Working Channels Playlist", len(working_channels), now_utc)
    with open(working_file, 'w', encoding='utf-8') as f:
        f.write(header_working)
        for extinf, stream_url, _ in working_channels:
            f.write(f"{extinf}\\n{stream_url}\\n")
    print(f"🟢 Saved Verified Working Playlist: {working_file} ({len(working_channels)} active channels)")

    # Save dead_channels.m3u
    dead_file = os.path.join(OUTPUT_DIR, "dead_channels.m3u")
    header_dead = get_m3u_header("Offline & Dead Channels Audit", len(dead_channels), now_utc)
    with open(dead_file, 'w', encoding='utf-8') as f:
        f.write(header_dead)
        for extinf, stream_url, _ in dead_channels:
            f.write(f"{extinf}\\n{stream_url}\\n")
    print(f"🔴 Saved Offline/Dead Channels Report: {dead_file} ({len(dead_channels)} offline channels)")

    print("\\n" + "=" * 65)
    print("📊 SYNC & STREAM HEALTH SUMMARY")
    print(f"Timestamp: {now_utc}")
    print(f"Total Scraped Channels: {len(all_channels)}")
    print(f"🟢 Working Online Channels: {len(working_channels)}")
    print(f"🔴 Dead/Offline Channels: {len(dead_channels)}")
    for line in summary_report:
        print(line)
    print("=" * 65)
    print("🎉 All M3U files generated with developer credentials successfully!")

if __name__ == "__main__":
    main()
`;
}

export function generateGithubActionYaml(scriptName = "update_playlists.py", cronSchedule = "0 0 * * *"): string {
  return `# .github/workflows/update_playlists.yml
name: 🔄 IPTV Categories 24h Auto Updater

on:
  schedule:
    # Runs automatically every 24 hours at 00:00 UTC (Midnight)
    - cron: '${cronSchedule}'
  workflow_dispatch:
    # Allows manually running the workflow from GitHub Actions tab anytime

permissions:
  contents: write

jobs:
  update-playlists:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4

      - name: 🐍 Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: 🚀 Run IPTV Category Updater Script
        run: |
          python ${scriptName}

      - name: 📤 Commit and Push Changes to GitHub Repo
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "🤖 Auto-update IPTV playlists [${ cronSchedule }] [skip ci]"
          file_pattern: 'playlists/*.m3u'
          commit_user_name: 'github-actions[bot]'
          commit_user_email: 'github-actions[bot]@users.noreply.github.com'
          commit_author: 'github-actions[bot] <github-actions[bot]@users.noreply.github.com>'
`;
}

export function generateReadmeMd(username = "YOUR_GITHUB_USERNAME", repo = "YOUR_REPO_NAME"): string {
  return `# 📺 IPTV Auto-Sync & Stream Health Verification Repository

Automated M3U playlist scraper & stream verifier powered by **GitHub Actions**.
Automatically fetches live channels from **iptv-org** every 24 hours, checks stream accessibility, and generates separate verified **working** and **dead** channel playlists.

👤 **Developer:** MD ANAMUL HOQUE  
🔗 **Telegram:** [t.me/ireentv](https://t.me/ireentv)  
🌐 **Website:** [anamul.pages.dev](https://anamul.pages.dev)  

---

## 🔗 Direct M3U Playlist Links

Replace \`${username}\` and \`${repo}\` with your GitHub username and repository name:

| Playlist Type | Description | Raw M3U Link |
|---|---|---|
| 🟢 **Working Channels** | **Only Verified Working Streams** | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/working_channels.m3u\` |
| 🌐 **All Categories Combined** | **Master Playlist (All Channels)** | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/all_categories.m3u\` |
| 🔴 **Dead / Offline Report** | **Audit of Dead & Broken Streams** | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/dead_channels.m3u\` |
| ⚽ **Sports** | Sports M3U | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/sports.m3u\` |
| 🎬 **Movies** | Movies M3U | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/movies.m3u\` |
| 🦁 **Documentary** | Documentary M3U | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/documentary.m3u\` |
| 👶 **Kids** | Kids M3U | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/kids.m3u\` |
| 🎭 **Entertainment** | Entertainment M3U | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/entertainment.m3u\` |
| 🎵 **Music** | Music M3U | \`https://raw.githubusercontent.com/${username}/${repo}/main/playlists/music.m3u\` |

---

## 🛠️ How it works
1. **GitHub Actions** runs \`update_playlists.py\` every night at 00:00 UTC.
2. The script downloads M3U category playlists and verifies stream availability.
3. Streams are classified into \`working_channels.m3u\` and \`dead_channels.m3u\`.
4. Git automatically commits and pushes updated M3U files back to GitHub with full developer headers!

---

## 📱 Supported IPTV Players
- **Android / Fire TV**: TiviMate, OTT Navigator, IPTV Smarters Pro, Televizo
- **Windows / Mac**: VLC Media Player, Kodi, PotPlayer
- **iOS / Apple TV**: GSE Smart IPTV, iPlayTV, nPlayer
- **Smart TV**: Smart IPTV, Net IPTV, SS IPTV
`;
}

export const BENGALI_SETUP_STEPS = [
  {
    step: 1,
    title: "গিটহাব রিপোজিটরি তৈরি করুন (Create Repository)",
    desc: "GitHub-এ যান এবং একটি নতুন Repository তৈরি করুন (যেমন: `my-iptv-playlists`)। Repo পাবলিক (Public) রাখা ভালো যাতে আপনার IPTV প্লেয়ার Raw URL পেতে পারে।",
    code: ""
  },
  {
    step: 2,
    title: "Workflow permissions সেটআপ করুন (খুব গুরুত্বপূর্ণ!)",
    desc: "গিটহাব ওয়ার্কার যেন ফাইল অটো আপডেট অ্যান্ড পুশ করতে পারে সেজন্য Permssion প্রয়োজন। Repo-র Settings > Actions > General এ যান। 'Workflow permissions' সেকশনে 'Read and write permissions' সিলেক্ট করে Save বাটনে ক্লিক করুন।",
    code: "Settings ➔ Actions ➔ General ➔ Workflow permissions ➔ Select 'Read and write permissions' ➔ Save"
  },
  {
    step: 3,
    title: "Python স্ক্রিপ্ট যোগ করুন (update_playlists.py)",
    desc: "আপনার রিপোজিটরির রুট ফোল্ডারে `update_playlists.py` নামের একটি ফাইল তৈরি করুন এবং পাশের ট্যাব থেকে দেওয়া Python কোডটি পেস্ট করে Commit করুন।",
    file: "update_playlists.py"
  },
  {
    step: 4,
    title: "GitHub Workflow YAML তৈরি করুন",
    desc: "আপনার রিপোজিটরিতে `.github/workflows/update_playlists.yml` পাথ নির্দেশ করে নতুন ফাইল তৈরি করুন এবং দেওয়া YAML কোডটি পেস্ট করে Commit করুন।",
    file: ".github/workflows/update_playlists.yml"
  },
  {
    step: 5,
    title: "ম্যানুয়াল রান বা অটো ২৪-ঘন্টা সিঙ্ক টেস্ট (Run & Verify)",
    desc: "GitHub-এর 'Actions' ট্যাবে যান। 'IPTV Categories 24h Auto Updater' ওয়ার্কফ্লো-তে ক্লিক করে 'Run workflow' বাটনে চাপ দিন। ১ মিনিটে স্ক্রিপ্টটি চলে আপনার Repo-তে `playlists/` ফোল্ডার তৈরি করবে এবং ৬টি ক্যাটাগরির সাথে Combined `all_categories.m3u` সেভ করবে!",
    code: "GitHub Repo ➔ Actions ➔ Select Workflow ➔ Run workflow"
  },
  {
    step: 6,
    title: "আপনার IPTV প্লেয়ারে লিঙ্ক যুক্ত করুন",
    desc: "আপনার তৈরি হওয়া `playlists/sports.m3u` বা `playlists/all_categories.m3u` ফাইলের 'Raw' বাটনে ক্লিক করে Raw URL কপি করুন। এবার TiviMate, OTT Navigator, VLC বা Smart TV অ্যাপে M3U Playlist হিসেবে পেস্ট করে চ্যানেল উপভোগ করুন!",
    code: "https://raw.githubusercontent.com/<YOUR_USERNAME>/<YOUR_REPO>/main/playlists/all_categories.m3u"
  }
];
