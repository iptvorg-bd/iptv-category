import React, { useState } from "react";
import { Play, Copy, Check, Tv, Radio } from "lucide-react";
import { ChannelItem } from "../types";

interface ChannelCardProps {
  channel: ChannelItem;
  onPlay: (channel: ChannelItem) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onPlay }) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(channel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => onPlay(channel)}
      className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-3.5 transition-all duration-200 group flex flex-col justify-between cursor-pointer relative overflow-hidden shadow-sm hover:shadow-indigo-500/10"
    >
      <div>
        {/* Top bar: Category badge & logo & health status */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {channel.category}
          </span>
          
          {channel.status === "working" ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ওয়ার্কিং {channel.checkLatencyMs ? `(${channel.checkLatencyMs}ms)` : ""}</span>
            </span>
          ) : channel.status === "dead" ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>ডেড / অফলাইন</span>
            </span>
          ) : channel.status === "checking" ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1 animate-pulse">
              <span>যাচাই হচ্ছে...</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">
              {channel.group || "IPTV"}
            </span>
          )}
        </div>

        {/* Channel Icon + Name */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden group-hover:border-indigo-500/30 transition">
            {channel.logo && !imgError ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-indigo-950/30 text-indigo-400 flex items-center justify-center font-bold text-sm">
                <Tv className="w-5 h-5 text-indigo-400" />
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <h4 className="font-semibold text-slate-100 text-sm truncate group-hover:text-indigo-300 transition">
              {channel.name}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {channel.tvgId ? `ID: ${channel.tvgId}` : "Live Stream Channel"}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(channel);
          }}
          className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1 px-2 rounded hover:bg-indigo-500/10 transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>প্লে টেস্ট</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white font-medium py-1 px-2 rounded hover:bg-slate-800 transition cursor-pointer"
          title="Copy Stream URL"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">কপি!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>URL কপি</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
