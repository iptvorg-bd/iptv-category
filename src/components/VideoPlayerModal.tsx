import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { X, Play, AlertCircle, Copy, Check, ExternalLink, ShieldAlert } from "lucide-react";
import { ChannelItem } from "../types";

interface VideoPlayerModalProps {
  channel: ChannelItem | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ channel, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!channel || !videoRef.current) return;

    setError(null);
    setLoading(true);

    const video = videoRef.current;
    let hls: Hls | null = null;

    const streamUrl = channel.url;

    if (Hls.isSupported() && streamUrl.includes(".m3u8")) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {
          // Autoplay was prevented
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Network/CORS error loading stream. Direct HTTP/HTTPS or token restricted by stream provider.");
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              setError("Playback failed. This IPTV stream may require an external player like VLC / TiviMate.");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS support
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener("error", () => {
        setError("Playback failed or format unsupported by browser native player.");
      });
    } else {
      // Direct video tag assignment fallback
      video.src = streamUrl;
      setLoading(false);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [channel]);

  if (!channel) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(channel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="w-10 h-10 object-contain rounded bg-slate-900 border border-slate-800 p-0.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                {channel.name.substring(0, 2)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-white text-base">{channel.name}</h3>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300">{channel.category}</span>
                {channel.tvgId && <span>TVG ID: {channel.tvgId}</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Stage */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs">Connecting to live IPTV stream...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950 text-slate-300">
              <ShieldAlert className="w-12 h-12 text-amber-400 mb-3" />
              <h4 className="text-base font-semibold text-white mb-1">ব্রাউজারে সরাসরি প্লে সমর্থিত নয়</h4>
              <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                অনেক সময় IPTV স্ট্রিমগুলো Cross-Origin (CORS) বা Token Restriction এর কারণে ব্রাউজার আইফ্রেমে সরাসরি কাজ করে না। আপনার IPTV Player (যেমন VLC, TiviMate, OTT Navigator) এ স্ট্রিম লিংকটি টেস্ট করুন।
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopyLink}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-medium flex items-center space-x-2 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "কপি হয়েছে" : "কপি স্ট্রিম লিঙ্ক"}</span>
                </button>
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>নতুন ট্যাবে খুলুন</span>
                </a>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        {/* Footer info & raw url */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="w-full sm:w-auto overflow-hidden text-ellipsis whitespace-nowrap bg-slate-900 px-3 py-2 rounded border border-slate-800 text-slate-300 font-mono flex-1">
            {channel.url}
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded font-medium flex items-center justify-center space-x-2 transition cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
            <span>{copied ? "কপি সম্পন্ন" : "কপি URL"}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
