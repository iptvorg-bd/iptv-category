import React from "react";
import { Tv, Terminal, RefreshCw, HelpCircle, Settings, FolderArchive, Sparkles } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRunSync: () => void;
  isSyncing: boolean;
  totalChannelsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRunSync,
  isSyncing,
  totalChannelsCount
}) => {
  const navItems = [
    { id: "code", label: "স্ক্রিপ্ট ও ওয়ার্কফ্লো (.py & .yml)", icon: Terminal },
    { id: "live", label: "লাইভ সিঙ্ক ও চ্যানেল ব্রাউজার", icon: RefreshCw, badge: totalChannelsCount > 0 ? `${totalChannelsCount}` : "Live" },
    { id: "guide", label: "গিটহাব সেটআপ গাইড (বাংলা)", icon: HelpCircle },
    { id: "config", label: "কাস্টম ক্যাটাগরি কনফিগার", icon: Settings },
    { id: "zip", label: "রেপো জিপ ডাউনলোড (ZIP)", icon: FolderArchive }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur bg-slate-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("code")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Tv className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">IPTV Auto Sync</span>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-500/20 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>v1.0 Worker</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 hidden sm:flex">
                <span className="text-indigo-300 font-medium">Dev: MD ANAMUL HOQUE</span>
                <span>•</span>
                <a href="https://t.me/ireentv" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Telegram</a>
                <span>•</span>
                <a href="https://anamul.pages.dev" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Website</a>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onRunSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg shadow-md hover:shadow-indigo-500/25 transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-white" : ""}`} />
              <span>{isSyncing ? "সিঙ্ক হচ্ছে..." : "লাইভ সিঙ্ক চালান"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none border-t border-slate-800/80 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                      isActive ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
