# -*- coding: utf-8 -*-
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

DEVELOPER_NAME = "MD ANAMUL HOQUE"
TELEGRAM_LINK = "https://t.me/ireentv"
WEBSITE_LINK = "https://anamul.pages.dev"
VERSION = "1.0"

def get_m3u_header(playlist_name, channels_amount, last_update):
    return (
        f"#EXTM3U\n"
        f"# Playlist Name: {playlist_name}\n"
        f"# Developer: {DEVELOPER_NAME}\n"
        f"# Telegram: {TELEGRAM_LINK}\n"
        f"# Website: {WEBSITE_LINK}\n"
        f"# Version: {VERSION}\n"
        f"# Channels Amount: {channels_amount}\n"
        f"# Last Update: {last_update}\n\n"
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTV-HealthChecker/1.0',
        'Range': 'bytes=0-1024'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status in [200, 206, 301, 302, 307, 308]:
                return channel_tuple, True
            return channel_tuple, False
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
                    f.write(f"{extinf}\n{stream_url}\n")
                
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
            f.write(f"{extinf}\n{stream_url}\n")
    print(f"✅ Created Master Playlist: {all_cat_file} ({len(all_channels)} channels)")

    # 2. Verify streams to produce working_channels.m3u and dead_channels.m3u
    working_channels, dead_channels = verify_all_streams(all_channels)

    # Save working_channels.m3u
    working_file = os.path.join(OUTPUT_DIR, "working_channels.m3u")
    header_working = get_m3u_header("Verified Working Channels Playlist", len(working_channels), now_utc)
    with open(working_file, 'w', encoding='utf-8') as f:
        f.write(header_working)
        for extinf, stream_url, _ in working_channels:
            f.write(f"{extinf}\n{stream_url}\n")
    print(f"🟢 Saved Verified Working Playlist: {working_file} ({len(working_channels)} active channels)")

    # Save dead_channels.m3u
    dead_file = os.path.join(OUTPUT_DIR, "dead_channels.m3u")
    header_dead = get_m3u_header("Offline & Dead Channels Audit", len(dead_channels), now_utc)
    with open(dead_file, 'w', encoding='utf-8') as f:
        f.write(header_dead)
        for extinf, stream_url, _ in dead_channels:
            f.write(f"{extinf}\n{stream_url}\n")
    print(f"🔴 Saved Offline/Dead Channels Report: {dead_file} ({len(dead_channels)} offline channels)")

    print("\n" + "=" * 65)
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
