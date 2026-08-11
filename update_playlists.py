# -*- coding: utf-8 -*-
"""
IPTV Category Auto-Updater Script
Fetches specified M3U category playlists from iptv-org every 24 hours.
Saves individual M3U files into 'playlists/' directory and creates 'all_categories.m3u'.
"""

import os
import sys
from datetime import datetime, timezone
import urllib.request
import urllib.error

# Directory where M3U files will be stored
OUTPUT_DIR = "playlists"

# Target IPTV Categories and URLs
CATEGORIES = {
    "sports": {
        "name": "Sports",
        "url": "https://iptv-org.github.io/iptv/categories/sports.m3u"
    },
    "movies": {
        "name": "Movies",
        "url": "https://iptv-org.github.io/iptv/categories/movies.m3u"
    },
    "documentary": {
        "name": "Documentary",
        "url": "https://iptv-org.github.io/iptv/categories/documentary.m3u"
    },
    "kids": {
        "name": "Kids",
        "url": "https://iptv-org.github.io/iptv/categories/kids.m3u"
    },
    "entertainment": {
        "name": "Entertainment",
        "url": "https://iptv-org.github.io/iptv/categories/entertainment.m3u"
    },
    "music": {
        "name": "Music",
        "url": "https://iptv-org.github.io/iptv/categories/music.m3u"
    }
}

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
                channels.append((current_extinf, line_str))
                current_extinf = None
    return channels

def main():
    print("=" * 60)
    print("🚀 IPTV Category Sync Worker Started")
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"⏰ Execution Time: {now_utc}")
    print("=" * 60)

    ensure_directory_exists(OUTPUT_DIR)

    all_channels = []
    summary_report = []

    for cat_id, info in CATEGORIES.items():
        name = info["name"]
        url = info["url"]
        
        content = download_m3u(cat_id, name, url)
        
        if content:
            file_path = os.path.join(OUTPUT_DIR, f"{cat_id}.m3u")
            header = f"#EXTM3U x-tvg-url=\"\"\n# IPTV Category: {name}\n# Last Updated: {now_utc}\n\n"
            
            channels = extract_channels_from_m3u(content, name)
            all_channels.extend(channels)
            
            lines = content.splitlines()
            body_lines = [l for l in lines if not l.startswith('#EXTM3U')]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(header)
                f.write("\n".join(body_lines))
                f.write("\n")
                
            ch_count = len(channels)
            summary_report.append(f"  • {name} ({cat_id}.m3u): {ch_count} channels")
            print(f"💾 Saved {file_path} ({ch_count} channels)")
        else:
            summary_report.append(f"  • {name} ({cat_id}.m3u): ⚠️ FAILED TO DOWNLOAD")

    # Combined master playlist
    combined_file = os.path.join(OUTPUT_DIR, "all_categories.m3u")
    print(f"\n📦 Creating combined playlist: {combined_file}...")
    
    with open(combined_file, 'w', encoding='utf-8') as f:
        f.write("#EXTM3U\n")
        f.write(f"# IPTV Combined Categories Master Playlist\n")
        f.write(f"# Total Channels: {len(all_channels)}\n")
        f.write(f"# Last Updated: {now_utc}\n\n")
        
        for extinf, stream_url in all_channels:
            f.write(f"{extinf}\n{stream_url}\n")

    print(f"✅ Master playlist saved with {len(all_channels)} total channels!")

    print("\n" + "=" * 60)
    print("📊 SYNC SUMMARY REPORT")
    print(f"Timestamp: {now_utc}")
    print(f"Total Combined Channels: {len(all_channels)}")
    for line in summary_report:
        print(line)
    print("=" * 60)
    print("🎉 All category playlists updated successfully!")

if __name__ == "__main__":
    main()