import React, { useState } from "react";
import { CheckCircle2, Copy, Check, ExternalLink, HelpCircle, AlertTriangle, ShieldCheck, Play, ArrowRight, Github } from "lucide-react";
import { BENGALI_SETUP_STEPS } from "../data/templates";

export const SetupGuide: React.FC = () => {
  const [username, setUsername] = useState("your-github-username");
  const [repoName, setRepoName] = useState("my-iptv-playlists");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const categories = [
    { name: "🟢 Working Channels", file: "working_channels.m3u", desc: "শুধুমাত্র ভেরিফাইড ওয়ার্কিং চ্যানেলসমূহ" },
    { name: "All Combined", file: "all_categories.m3u", desc: "সব ক্যাটাগরি একসাথে (Master List)" },
    { name: "🔴 Dead Channels Report", file: "dead_channels.m3u", desc: "অফলাইন/ডেড চ্যানেল রিপোর্ট" },
    { name: "Sports", file: "sports.m3u", desc: "স্পোর্টস চ্যানেল" },
    { name: "Movies", file: "movies.m3u", desc: "মুভি চ্যানেল" },
    { name: "Documentary", file: "documentary.m3u", desc: "ডকুমেন্টারি" },
    { name: "Kids", file: "kids.m3u", desc: "কার্টুন ও কিডস" },
    { name: "Entertainment", file: "entertainment.m3u", desc: "এন্টারটেইনমেন্ট" },
    { name: "Music", file: "music.m3u", desc: "মিউজিক" },
  ];

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            <Github className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              গিটহাব সেটআপ ও অটো-সিঙ্ক গাইড (Step-by-Step)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              কীভাবে খুব সহজে আপনার নিজস্ব GitHub Repository তে প্রতি ২৪ ঘন্টার অটো-আপডেটার সেট করবেন।
            </p>
          </div>
        </div>
      </div>

      {/* GitHub Username & Repo Name Configurator for Raw Links Generator */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>আপনার GitHub Raw M3U URL জেনারেটর</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          আপনার GitHub Username এবং Repository Name দিন, তাহলে আপনার প্লেলিস্টের একদম প্রস্তুত Raw M3U লিংক পাবেন:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs text-slate-300 font-semibold mb-1">GitHub Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim() || "your-username")}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white"
              placeholder="e.g. feniireen"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-semibold mb-1">Repository Name:</label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value.trim() || "iptv-playlists")}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white"
              placeholder="e.g. my-iptv-playlists"
            />
          </div>
        </div>

        {/* Generated M3U Raw URLs */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-300">আপনার তৈরি হওয়া M3U প্লেলিস্ট লিংকসমূহ:</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {categories.map((cat) => {
              const url = `https://raw.githubusercontent.com/${username}/${repoName}/main/playlists/${cat.file}`;
              return (
                <div key={cat.file} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-indigo-300 flex items-center space-x-1">
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({cat.desc})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{url}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(url, cat.file)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded font-medium shrink-0 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedLink === cat.file ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{copiedLink === cat.file ? "কপি!" : "কপি"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Step by Step Setup List */}
      <div className="space-y-4">
        {BENGALI_SETUP_STEPS.map((stepItem) => (
          <div
            key={stepItem.step}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden"
          >
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow">
                {stepItem.step}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-base font-bold text-white">
                  {stepItem.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {stepItem.desc}
                </p>

                {stepItem.file && (
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 inline-block">
                    <span className="text-xs text-slate-400">তৈরি করার ফাইল নেম: </span>
                    <code className="text-xs text-indigo-400 font-mono font-bold">{stepItem.file}</code>
                  </div>
                )}

                {stepItem.code && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-xs text-emerald-400 overflow-x-auto">
                    {stepItem.code}
                  </div>
                )}

                {stepItem.step === 2 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl flex items-start space-x-2 mt-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      <strong>সতর্কতা:</strong> Step 2 (Read and write permissions) না দিলে GitHub Action ফাইল আপডেট বা পুশ করতে গিয়ে "Permission denied 403" এরর দিবে।
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
