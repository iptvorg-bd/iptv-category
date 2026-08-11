#!/usr/bin/env python3
"""
IPTV Auto-Updater & Health Checker Script
Automates category playlist aggregation and stream verification.
Generated for GitHub Actions automation.
"""

import os
import sys
import re
import ssl
from datetime import datetime, timezone
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# Disable SSL certificate verification for IPTV streams with self-signed SSL certs
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

# Output folder where M3U files will be stored
OUTPUT_DIR = "playlists"

# Category sources configuration
CATEGORY_SOURCES = [
    {
        'id': 'sports',
        'name': 'Sports',
        'url': 'https://iptv-org.github.io/iptv/categories/sports.m3u'
    },
    {
        'id': 'movies',
        'name': 'Movies',
        'url': 'https://iptv-org.github.io/iptv/categories/movies.m3u'
    },
    {
        'id': 'entertainment',
        'name': 'Entertainment',
        'url': 'https://iptv-org.github.io/iptv/categories/entertainment.m3u'
    },
    {
        'id': 'documentary',
        'name': 'Documentary',
        'url': 'https://iptv-org.github.io/iptv/categories/documentary.m3u'
    },
    {
        'id': 'music',
        'name': 'Music',
        'url': 'https://iptv-org.github.io/iptv/categories/music.m3u'
    },
    {
        'id': 'kids',
        'name': 'Kids',
        'url': 'https://iptv-org.github.io/iptv/categories/kids.m3u'
    }
]

def parse_m3u(content, default_category):
    """
    Parses raw M3U text into structured tuples: (extinf_line, stream_url, category_name)
    """
    channels = []
    lines = content.strip().splitlines()
    current_extinf = None

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith("#EXTINF:"):
            current_extinf = line
        elif not line.startswith("#") and current_extinf:
            channels.append((current_extinf, line, default_category))
            current_extinf = None

    return channels

def fetch_category(source):
    """
    Downloads and parses a single category M3U playlist.
    """
    cat_id = source['id']
    name = source['name']
    url = source['url']

    headers = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*'
    }
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=30, context=SSL_CONTEXT) as response:
            if response.status == 200:
                content = response.read().decode('utf-8', errors='ignore')
                print(f"✅ Downloaded [{name}]. Size: {len(content)} bytes.")
                return cat_id, name, content
            else:
                print(f"⚠️ Failed [{name}]: HTTP Status {response.status}")
                return cat_id, name, None
    except Exception as e:
        print(f"❌ Error downloading [{name}] from {url}: {e}")
        return cat_id, name, None

def test_single_stream(channel_tuple):
    """
    Verifies if a stream URL is active and returning valid video/playlist content.
    Filters out HTML error pages, link shorteners, and fake dead links.
    """
    extinf, url, cat = channel_tuple
    headers = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
        'Range': 'bytes=0-2048'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6, context=SSL_CONTEXT) as response:
            status = response.status
            final_url = response.geturl().lower()
            content_type = response.headers.get('Content-Type', '').lower()
            
            if status not in [200, 206]:
                return channel_tuple, False
                
            # Filter shorteners & ad domains
            shortener_domains = ['jmp2.uk', 'short.gy', 'dyndns.org', 'hostlagarto.com', 'bit.ly', 'tinyurl.com', 'goo.gl', 't.co']
            if any(dom in url.lower() or dom in final_url for dom in shortener_domains):
                return channel_tuple, False

            # Read sample chunk
            chunk = response.read(2048)
            try:
                chunk_str = chunk.decode('utf-8', errors='ignore').lower()
            except Exception:
                chunk_str = ""

            # 1. HTML / Shortener / Web page / JSON page detection
            if ('text/html' in content_type or 'xhtml' in content_type or 'json' in content_type or
                '<!doctype html' in chunk_str or '<html' in chunk_str or
                '<head' in chunk_str or '<script' in chunk_str or '404 not found' in chunk_str or
                'access denied' in chunk_str or 'cloudflare' in chunk_str or 'short.gy' in chunk_str or
                'jmp2.uk' in chunk_str):
                return channel_tuple, False

            # 2. Strict HLS Playlist validation
            is_hls = '.m3u8' in url.lower() or '.m3u8' in final_url or 'mpegurl' in content_type
            if is_hls:
                has_hls_header = ('#extm3u' in chunk_str or '#ext-x-' in chunk_str or
                                  '#extinf' in chunk_str or '.ts' in chunk_str or '.m3u8' in chunk_str)
                if not has_hls_header:
                    return channel_tuple, False
            else:
                # Direct media stream validation
                is_media = any(m in content_type for m in ['video', 'audio', 'octet-stream', 'mpeg', 'stream'])
                if not is_media and ('text/plain' in content_type or content_type == ''):
                    if '<' in chunk_str or 'error' in chunk_str or len(chunk_str) < 10:
                        return channel_tuple, False

            return channel_tuple, True
    except Exception:
        return channel_tuple, False

def verify_all_streams(all_channels):
    """
    Runs multi-threaded health check across all collected channels.
    """
    print(f"\n🔍 Starting stream health checks for {len(all_channels)} channels (20 threads)...")
    working = []
    dead = []
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(test_single_stream, ch): ch for ch in all_channels}
        completed = 0
        total = len(all_channels)
        
        for future in as_completed(futures):
            completed += 1
            ch, is_working = future.result()
            if is_working:
                working.append(ch)
            else:
                dead.append(ch)
                
            if completed % 50 == 0 or completed == total:
                print(f"   Progress: {completed}/{total} tested ({len(working)} working, {len(dead)} dead)")

    return working, dead

def get_m3u_header(title, count, now_utc):
    return (
        f"#EXTM3U x-tvg-url=\"\"\n"
        f"# =========================================================\n"
        f"# {title}\n"
        f"# Total Channels: {count}\n"
        f"# Last Sync: {now_utc}\n"
        f"# Generated automatically via GitHub Actions\n"
        f"# =========================================================\n\n"
    )

def main():
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"🚀 Starting IPTV Category Sync & Verification Job [{now_utc}]")

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_channels = []
    category_files_written = 0

    # 1. Fetch all category sources
    for source in CATEGORY_SOURCES:
        cat_id, cat_name, raw_m3u = fetch_category(source)
        if raw_m3u:
            channels = parse_m3u(raw_m3u, cat_name)
            all_channels.extend(channels)

            # Save individual category playlist file inside playlists/
            cat_filename = os.path.join(OUTPUT_DIR, f"{cat_id}.m3u")
            header = get_m3u_header(f"{cat_name} Category Playlist", len(channels), now_utc)
            with open(cat_filename, 'w', encoding='utf-8') as f:
                f.write(header)
                for extinf, url, _ in channels:
                    f.write(f"{extinf}\n{url}\n")
            category_files_written += 1

    # Save aggregated all_categories.m3u
    all_cat_filename = os.path.join(OUTPUT_DIR, "all_categories.m3u")
    header_all = get_m3u_header("All Categories Master Playlist", len(all_channels), now_utc)
    with open(all_cat_filename, 'w', encoding='utf-8') as f:
        f.write(header_all)
        for extinf, url, _ in all_channels:
            f.write(f"{extinf}\n{url}\n")

    print(f"📁 Written {category_files_written} category M3U files + master all_categories.m3u in '{OUTPUT_DIR}/'.")

    # 2. Verify streams to produce working_channels.m3u and dead_channels.m3u
    working_channels, dead_channels = verify_all_streams(all_channels)

    # Save working_channels.m3u in both playlists/ and root folder
    working_targets = [os.path.join(OUTPUT_DIR, "working_channels.m3u"), "working_channels.m3u"]
    header_working = get_m3u_header("Verified Working Channels Playlist", len(working_channels), now_utc)
    for w_target in working_targets:
        with open(w_target, 'w', encoding='utf-8') as f:
            f.write(header_working)
            for extinf, stream_url, _ in working_channels:
                f.write(f"{extinf}\n{stream_url}\n")
    print(f"🟢 Saved Verified Working Playlist: playlists/working_channels.m3u & working_channels.m3u ({len(working_channels)} active channels)")

    # Save dead_channels.m3u in both playlists/ and dead_channels.m3u in root folder
    dead_targets = [os.path.join(OUTPUT_DIR, "dead_channels.m3u"), "dead_channels.m3u"]
    header_dead = get_m3u_header("Offline & Dead Channels Audit", len(dead_channels), now_utc)
    for d_target in dead_targets:
        with open(d_target, 'w', encoding='utf-8') as f:
            f.write(header_dead)
            for extinf, stream_url, _ in dead_channels:
                f.write(f"{extinf}\n{stream_url}\n")
    print(f"🔴 Saved Offline/Dead Channels Report: playlists/dead_channels.m3u & dead_channels.m3u ({len(dead_channels)} offline channels)")

    print("\n" + "=" * 65)
    print("📊 SYNC & STREAM HEALTH SUMMARY")
    print(f"• Total Channels Processed: {len(all_channels)}")
    print(f"• Active / Working Channels: {len(working_channels)}")
    print(f"• Offline / Dead Channels  : {len(dead_channels)}")
    print("=" * 65)

if __name__ == "__main__":
    main()
