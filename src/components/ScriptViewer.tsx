import React, { useState } from "react";
import { Copy, Check, Terminal, FileCode, FileText, Download, Sparkles, CheckCircle2, FolderTree } from "lucide-react";
import { CategoryConfig } from "../types";
import { generatePythonScript, generateGithubActionYaml, generateReadmeMd } from "../data/templates";

interface ScriptViewerProps {
  categories: CategoryConfig[];
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({ categories }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<"py" | "yml" | "readme">("py");
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const pythonCode = generatePythonScript(categories);
  const yamlCode = generateGithubActionYaml();
  const readmeCode = generateReadmeMd();

  const handleCopy = (code: string, tabName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1 rounded-full border border-indigo-500/20 mb-3 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>প্রতি ২৪ ঘন্টা অন্তর গিটহাব রেপো অটো-সিঙ্ক্রোনাইজেশন</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              IPTV Auto Updater Script & GitHub Workflow
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              নিচের Python স্ক্রিপ্ট ও GitHub Action YAML ফাইলটি আপনার GitHub Repository-তে যুক্ত করলে, গিটহাব অটোমেটিক প্রতি ২৪ ঘন্টা পর iptv-org থেকে নতুন চ্যানেলসহ M3U প্লেলিস্ট ডাউনলোড ও সেভ করবে।
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300 min-w-[200px]">
            <FolderTree className="w-8 h-8 text-indigo-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">আউটপুট ফোল্ডার:</div>
              <div className="text-slate-400">`playlists/` (৬টি ক্যাটাগরি + Combined)</div>
            </div>
          </div>
        </div>

        {/* Selected Categories List */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-medium py-1">সিঙ্ক করা ক্যাটাগরি সমূহ:</span>
          {categories.filter(c => c.enabled).map(cat => (
            <span key={cat.id} className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span>{cat.name} ({cat.id}.m3u)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        
        {/* Code Tabs Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex space-x-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCodeTab("py")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeCodeTab === "py"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>update_playlists.py</span>
            </button>

            <button
              onClick={() => setActiveCodeTab("yml")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeCodeTab === "yml"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>update_playlists.yml</span>
            </button>

            <button
              onClick={() => setActiveCodeTab("readme")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeCodeTab === "readme"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>README.md</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const code = activeCodeTab === "py" ? pythonCode : activeCodeTab === "yml" ? yamlCode : readmeCode;
                handleCopy(code, activeCodeTab);
              }}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              {copiedTab === activeCodeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">কপি সম্পন্ন!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>কপি করুন (Copy Code)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Box */}
        <div className="p-4 bg-slate-950 overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed text-slate-200 max-h-[550px] scrollbar-thin">
          <pre className="whitespace-pre">
            {activeCodeTab === "py" && pythonCode}
            {activeCodeTab === "yml" && yamlCode}
            {activeCodeTab === "readme" && readmeCode}
          </pre>
        </div>

        {/* File Path Reminder Footer */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300">ফাইলের সঠিক পাথ:</span>
            <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
              {activeCodeTab === "py" && "update_playlists.py"}
              {activeCodeTab === "yml" && ".github/workflows/update_playlists.yml"}
              {activeCodeTab === "readme" && "README.md"}
            </code>
          </div>
          <span className="hidden sm:inline text-slate-500">
            {activeCodeTab === "py" && "Python standard library (No pip dependencies needed)"}
            {activeCodeTab === "yml" && "GitHub Actions Workflow (Cron: Every 24 hours)"}
            {activeCodeTab === "readme" && "Markdown Documentation with raw playlist links"}
          </span>
        </div>

      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">নতুন চ্যানেল অটো যোগ হবে</h3>
          <p className="text-xs text-slate-400 mt-1">
            iptv-org প্লেলিস্টে যদি নতুন কোনো চ্যানেল যুক্ত হয়, তবে স্ক্রিপ্টটি চলার সাথে সাথে সেটি অটোমেটিক আপনার প্লেলিস্টে ক্যাটাগরি অনুযায়ী সিঙ্ক হবে।
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2">
            <FolderTree className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">আলাদা ও কম্বাইন্ড প্লেলিস্ট</h3>
          <p className="text-xs text-slate-400 mt-1">
            প্রত্যেকটি ক্যাটাগরির আলাদা M3U (যেমন `sports.m3u`) তৈরির পাশাপাশি সব চ্যানেল নিয়ে একটি `all_categories.m3u` মাস্টার ফাইলও সেভ হবে।
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
            <Terminal className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">জিরো কনফিগারেশন ফি</h3>
          <p className="text-xs text-slate-400 mt-1">
            স্ক্রিপ্টটিতে কোনো বাইরের pip লাইব্রেরি বা পেইড সার্ভারের প্রয়োজন নেই। GitHub-এর ফ্রি পাবলিক রিপোজিটরি ও ফ্রি Actions Worker দিয়েই পুরো কাজ চলবে!
          </p>
        </div>
      </div>

    </div>
  );
};
