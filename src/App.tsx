import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { ScriptViewer } from "./components/ScriptViewer";
import { LiveSyncDashboard } from "./components/LiveSyncDashboard";
import { SetupGuide } from "./components/SetupGuide";
import { CustomConfigurator } from "./components/CustomConfigurator";
import { RepoZipExporter } from "./components/RepoZipExporter";
import { DEFAULT_CATEGORIES } from "./data/templates";
import { CategoryConfig, SyncAllResponse } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("code");
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [syncData, setSyncData] = useState<SyncAllResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Trigger live sync against backend Express server
  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const activeCats = categories.filter(c => c.enabled);
      const res = await fetch("/api/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: activeCats })
      });

      if (!res.ok) {
        throw new Error(`Sync failed: HTTP ${res.status}`);
      }

      const data: SyncAllResponse = await res.json();
      setSyncData(data);
    } catch (err: any) {
      setSyncError(err.message || "Failed to execute live sync");
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto sync on initial load if tab switched to live
  useEffect(() => {
    if (activeTab === "live" && !syncData && !isSyncing) {
      handleRunSync();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunSync={handleRunSync}
        isSyncing={isSyncing}
        totalChannelsCount={syncData?.totalChannels || 0}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {syncError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-center justify-between">
            <span>⚠️ সিঙ্ক করার সময় সমস্যা দেখা দিয়েছে: {syncError}</span>
            <button
              onClick={handleRunSync}
              className="underline font-bold hover:text-white cursor-pointer ml-2"
            >
              পুনরায় চেষ্টা করুন
            </button>
          </div>
        )}

        {activeTab === "code" && (
          <ScriptViewer categories={categories} />
        )}

        {activeTab === "live" && (
          <LiveSyncDashboard
            categories={categories}
            syncData={syncData}
            isSyncing={isSyncing}
            onRunSync={handleRunSync}
          />
        )}

        {activeTab === "guide" && (
          <SetupGuide />
        )}

        {activeTab === "config" && (
          <CustomConfigurator
            categories={categories}
            setCategories={setCategories}
          />
        )}

        {activeTab === "zip" && (
          <RepoZipExporter categories={categories} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">IPTV Auto Sync Worker</span>
            <span>•</span>
            <span>GitHub Actions 24h Cron Synchronizer</span>
          </div>
          <div>
            Powered by Python & GitHub Actions
          </div>
        </div>
      </footer>

    </div>
  );
}
