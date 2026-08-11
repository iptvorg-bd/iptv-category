import React, { useState, useMemo } from "react";
import { RefreshCw, Search, Filter, Tv, CheckCircle2, AlertCircle, Play, Copy, Check, ExternalLink, Layers, Sparkles, Activity, Download, FileText } from "lucide-react";
import { CategoryConfig, ChannelItem, SyncAllResponse, SyncCategoryResult } from "../types";
import { ChannelCard } from "./ChannelCard";
import { VideoPlayerModal } from "./VideoPlayerModal";

interface LiveSyncDashboardProps {
  categories: CategoryConfig[];
  syncData: SyncAllResponse | null;
  isSyncing: boolean;
  onRunSync: () => void;
}

export const LiveSyncDashboard: React.FC<LiveSyncDashboardProps> = ({
  categories,
  syncData,
  isSyncing,
  onRunSync
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "working" | "dead">("all");
  const [selectedChannelForPlay, setSelectedChannelForPlay] = useState<ChannelItem | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  const [channelList, setChannelList] = useState<ChannelItem[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);

  // Extract initial channels list when syncData changes
  React.useEffect(() => {
    if (!syncData) return;
    const list: ChannelItem[] = [];
    Object.entries(syncData.categories).forEach(([_catId, catRes]) => {
      const resData = catRes as SyncCategoryResult;
      if (resData.channels) {
        list.push(...resData.channels);
      }
    });
    setChannelList(list);
    setVerificationDone(false);
  }, [syncData]);

  // Handle stream verification
  const handleVerifyStreams = async () => {
    if (!channelList.length || isVerifying) return;
    setIsVerifying(true);

    try {
      // Mark channels as checking
      setChannelList(prev => prev.map(ch => ({ ...ch, status: "checking" as const })));

      // Process in batches of 30 channels
      const batchSize = 30;
      const updatedChannels: ChannelItem[] = [];

      for (let i = 0; i < channelList.length; i += batchSize) {
        const batch = channelList.slice(i, i + batchSize);
        const res = await fetch("/api/verify-streams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channels: batch })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.results) {
            updatedChannels.push(...data.results);
          } else {
            updatedChannels.push(...batch.map(c => ({ ...c, status: "dead" as const })));
          }
        } else {
          updatedChannels.push(...batch.map(c => ({ ...c, status: "dead" as const })));
        }
      }

      setChannelList(updatedChannels);
      setVerificationDone(true);
    } catch (err) {
      console.error("Verification failed", err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Stats calculation
  const workingCount = useMemo(() => channelList.filter(c => c.status === "working").length, [channelList]);
  const deadCount = useMemo(() => channelList.filter(c => c.status === "dead").length, [channelList]);

  // Filter channels based on search, category filter, & status filter
  const filteredChannels = useMemo(() => {
    return channelList.filter(ch => {
      const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ch.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ch.tvgId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || ch.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesStatus = statusFilter === "all" ||
                            (statusFilter === "working" && ch.status === "working") ||
                            (statusFilter === "dead" && ch.status === "dead");
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [channelList, searchQuery, selectedCategory, statusFilter]);

  // Export M3U with developer header
  const handleExportM3U = (type: "working" | "dead" | "all") => {
    let targetChannels = channelList;
    let playlistName = "All Categories M3U Playlist";
    let filename = "all_categories.m3u";

    if (type === "working") {
      targetChannels = channelList.filter(c => c.status === "working");
      playlistName = "Verified Working Channels M3U";
      filename = "working_channels.m3u";
    } else if (type === "dead") {
      targetChannels = channelList.filter(c => c.status === "dead");
      playlistName = "Offline / Dead Channels M3U Report";
      filename = "dead_channels.m3u";
    }

    const header = `#EXTM3U
# Playlist Name: ${playlistName}
# Developer: MD ANAMUL HOQUE
# Telegram: https://t.me/ireentv
# Website: https://anamul.pages.dev
# Version: 1.0
# Channels Amount: ${targetChannels.length}
# Last Update: ${new Date().toISOString()}

`;

    const body = targetChannels.map(ch => `${ch.rawExtInf || `#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}`}\n${ch.url}`).join("\n");
    const fullContent = header + body;

    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Live Sync & Health Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            লাইভ প্লেলিস্ট ফেচ, স্ট্রিম ভেরিফাই ও M3U এক্সপোর্ট
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            iptv-org প্লেলিস্ট থেকে বাংলাদেশ নেটওয়ার্ক ও গ্লোবাল সার্ভারে সরাসরি চ্যানেলগুলো টেস্ট করে <strong>working_channels.m3u</strong> এবং <strong>dead_channels.m3u</strong> এক্সপোর্ট করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRunSync}
            disabled={isSyncing}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition duration-200 flex items-center space-x-2 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "সিঙ্ক হচ্ছে..." : "১. প্লেলিস্ট সিঙ্ক"}</span>
          </button>

          <button
            onClick={handleVerifyStreams}
            disabled={isVerifying || channelList.length === 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition duration-200 flex items-center space-x-2 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
          >
            <Activity className={`w-4 h-4 ${isVerifying ? "animate-pulse" : ""}`} />
            <span>{isVerifying ? "যাচাই করা হচ্ছে..." : "২. ওয়ার্কিং/ডেড চ্যানেল টেস্ট"}</span>
          </button>
        </div>
      </div>

      {/* Stream Health Quick Summary Bar if verification run */}
      {verificationDone && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400 font-semibold uppercase">🟢 ওয়ার্কিং চ্যানেল (Working)</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{workingCount} টি</h3>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">যেগুলো সরাসরি প্লে ও রেসপন্স করে</p>
            </div>
            <button
              onClick={() => handleExportM3U("working")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>M3U এক্সপোর্ট</span>
            </button>
          </div>

          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-400 font-semibold uppercase">🔴 ডেড চ্যানেল (Dead / Offline)</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{deadCount} টি</h3>
              <p className="text-[11px] text-rose-300/80 mt-0.5">404/Timeout হওয়া অফলাইন চ্যানেল</p>
            </div>
            <button
              onClick={() => handleExportM3U("dead")}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>M3U এক্সপোর্ট</span>
            </button>
          </div>

          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase">🌐 মাস্টার প্লেলিস্ট (Combined)</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{channelList.length} টি</h3>
              <p className="text-[11px] text-indigo-300/80 mt-0.5">সব ক্যাটাগরি একসাথে (all_categories.m3u)</p>
            </div>
            <button
              onClick={() => handleExportM3U("all")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>M3U এক্সপোর্ট</span>
            </button>
          </div>
        </div>
      )}

      {/* Sync Details & Search Bar */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="চ্যানেলের নাম, ক্যাটাগরি বা টিভিজি আইডি খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition"
            />
          </div>

          {/* Working Status Toggle Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              সব ({channelList.length})
            </button>
            <button
              onClick={() => setStatusFilter("working")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                statusFilter === "working" ? "bg-emerald-600 text-white" : "text-emerald-400 hover:bg-emerald-950/50"
              }`}
            >
              <span>🟢 ওয়ার্কিং</span>
              {verificationDone && <span>({workingCount})</span>}
            </button>
            <button
              onClick={() => setStatusFilter("dead")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                statusFilter === "dead" ? "bg-rose-600 text-white" : "text-rose-400 hover:bg-rose-950/50"
              }`}
            >
              <span>🔴 ডেড</span>
              {verificationDone && <span>({deadCount})</span>}
            </button>
          </div>

          {/* Category Quick Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              সব ক্যাটাগরি
            </button>
            {categories.filter(c => c.enabled).map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name.toLowerCase())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.name.toLowerCase()
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

        </div>

        {/* Sync Metadata summary bar */}
        {syncData && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>সর্বশেষ সিঙ্ক: <strong className="text-white">{new Date(syncData.timestamp).toLocaleTimeString()}</strong></span>
            </div>
            <div className="flex items-center space-x-4">
              <span>মোট চ্যানেল: <strong className="text-indigo-400 font-bold">{channelList.length} টি</strong></span>
              {verificationDone && (
                <>
                  <span className="text-emerald-400 font-semibold">🟢 ওয়ার্কিং: {workingCount}</span>
                  <span className="text-rose-400 font-semibold">🔴 ডেড: {deadCount}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Channels Grid */}
        {filteredChannels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {filteredChannels.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onPlay={(ch) => setSelectedChannelForPlay(ch)}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-950/50 rounded-xl border border-slate-800/60 my-4">
            <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">
              {syncData ? "কোনো চ্যানেল খুঁজে পাওয়া যায়নি" : "লাইভ সিঙ্ক চালাননি"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {syncData
                ? "আপনার সার্চ বা হেলথ ফিল্টারের সাথে মিলিয়ে কোনো চ্যানেল পাওয়া যায়নি।"
                : "উপরে '১. প্লেলিস্ট সিঙ্ক' বাটনে ক্লিক করে চ্যানেলগুলো লোড করুন।"}
            </p>
            {!syncData && (
              <button
                onClick={onRunSync}
                disabled={isSyncing}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-medium inline-flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                <span>লাইভ সিঙ্ক স্টার্ট করুন</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* Video Player Modal */}
      {selectedChannelForPlay && (
        <VideoPlayerModal
          channel={selectedChannelForPlay}
          onClose={() => setSelectedChannelForPlay(null)}
        />
      )}

    </div>
  );
};
