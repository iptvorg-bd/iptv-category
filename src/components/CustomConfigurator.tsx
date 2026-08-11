import React, { useState } from "react";
import { Plus, Trash2, RotateCcw, Check, Copy, Settings, Sparkles, Folder } from "lucide-react";
import { CategoryConfig } from "../types";
import { DEFAULT_CATEGORIES, generatePythonScript, generateGithubActionYaml } from "../data/templates";

interface CustomConfiguratorProps {
  categories: CategoryConfig[];
  setCategories: React.Dispatch<React.SetStateAction<CategoryConfig[]>>;
}

export const CustomConfigurator: React.FC<CustomConfiguratorProps> = ({
  categories,
  setCategories
}) => {
  const [outputDir, setOutputDir] = useState("playlists");
  const [cronSchedule, setCronSchedule] = useState("0 0 * * *");
  const [newCatName, setNewCatName] = useState("");
  const [newCatUrl, setNewCatUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const handleToggleCategory = (id: string) => {
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleRemoveCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatUrl.trim()) return;

    const id = newCatName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const newCat: CategoryConfig = {
      id,
      name: newCatName.trim(),
      url: newCatUrl.trim(),
      description: `Custom playlist for ${newCatName.trim()}`,
      enabled: true
    };

    setCategories(prev => [...prev, newCat]);
    setNewCatName("");
    setNewCatUrl("");
  };

  const handleReset = () => {
    setCategories(DEFAULT_CATEGORIES);
    setOutputDir("playlists");
    setCronSchedule("0 0 * * *");
  };

  const currentPythonCode = generatePythonScript(categories, outputDir);
  const currentYamlCode = generateGithubActionYaml("update_playlists.py", cronSchedule);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Settings className="w-4 h-4" />
            <span>Custom Category & Schedule Configurator</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            কাস্টম ক্যাটাগরি ও প্লেলিস্ট ইউআরএল যোগ করুন
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            আপনার পছন্দের অন্য কোনো M3U ক্যাটাগরি লিঙ্ক বা কাস্টম আউটপুট ফোল্ডার সেট করে দিন।
          </p>
        </div>

        <button
          onClick={handleReset}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-xl font-medium flex items-center space-x-2 transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4" />
          <span>রিসেট ডিফল্ট (Reset)</span>
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Active Categories Manager */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <span>বর্তমানে সক্রিয় ক্যাটাগরি সমূহ</span>
            <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              {categories.filter(c => c.enabled).length} টি ক্যাটাগরি অন
            </span>
          </h3>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                  cat.enabled ? "bg-slate-950 border-slate-800" : "bg-slate-950/40 border-slate-900 opacity-60"
                }`}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <input
                    type="checkbox"
                    checked={cat.enabled}
                    onChange={() => handleToggleCategory(cat.id)}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-200">{cat.name} ({cat.id}.m3u)</div>
                    <div className="text-[10px] text-slate-500 truncate">{cat.url}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveCategory(cat.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition cursor-pointer"
                  title="Remove Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Custom Category Form */}
          <form onSubmit={handleAddCategory} className="pt-3 border-t border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">নতুন কাস্টম M3U ক্যাটাগরি যোগ করুন:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Category Name (e.g. News)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                type="url"
                placeholder="M3U URL (https://...m3u)"
                value={newCatUrl}
                onChange={(e) => setNewCatUrl(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ক্যাটাগরি যুক্ত করুন</span>
            </button>
          </form>

        </div>

        {/* Right: Output Dir & Cron Schedule settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <h3 className="text-sm font-bold text-white">ওয়ার্কফ্লো ও আউটপুট কনফিগারেশন</h3>

          {/* Output Directory */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              আউটপুট ফোল্ডারের নাম (Output Folder Name):
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value.trim() || "playlists")}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              গিটহাব রেপোতে যে ফোল্ডারে M3U ফাইলগুলো জমা হবে (ডিফল্ট: `playlists`).
            </p>
          </div>

          {/* Cron Schedule */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              GitHub Actions Cron টাইমার (Schedule):
            </label>
            <select
              value={cronSchedule}
              onChange={(e) => setCronSchedule(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
            >
              <option value="0 0 * * *">0 0 * * * (প্রতি ২৪ ঘন্টায় ১ বার - রাত ১২টা UTC)</option>
              <option value="0 */12 * * *">0 */12 * * * (প্রতি ১২ ঘন্টায় ১ বার)</option>
              <option value="0 */6 * * *">0 */6 * * * (প্রতি ৬ ঘন্টায় ১ বার)</option>
              <option value="0 */1 * * *">0 */1 * * * (প্রতি ১ ঘন্টায় ১ বার)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              GitHub Action কতক্ষণ পর পর অটো রান করে চ্যানেল সিঙ্ক করবে।
            </p>
          </div>

          {/* Real-time Code Preview Summary */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300">কাস্টম জেনারেটেড পাইথন প্রিভিউ:</span>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 max-h-36 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{currentPythonCode.substring(0, 400)}...</pre>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
