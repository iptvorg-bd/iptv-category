import React, { useState } from "react";
import JSZip from "jszip";
import { Download, FolderArchive, CheckCircle2, FileCode, Terminal, Sparkles, FolderTree } from "lucide-react";
import { CategoryConfig } from "../types";
import { generatePythonScript, generateGithubActionYaml, generateReadmeMd } from "../data/templates";

interface RepoZipExporterProps {
  categories: CategoryConfig[];
}

export const RepoZipExporter: React.FC<RepoZipExporterProps> = ({ categories }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadZip = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const zip = new JSZip();

      // Python script
      const pythonContent = generatePythonScript(categories);
      zip.file("update_playlists.py", pythonContent);

      // Workflow YAML
      const yamlContent = generateGithubActionYaml();
      const workflowFolder = zip.folder(".github")?.folder("workflows");
      workflowFolder?.file("update_playlists.yml", yamlContent);

      // README
      const readmeContent = generateReadmeMd();
      zip.file("README.md", readmeContent);

      // .gitignore
      zip.file(".gitignore", "__pycache__/\n*.pyc\n.DS_Store\n");

      // Initial empty playlists folder placeholder
      const playlistsFolder = zip.folder("playlists");
      playlistsFolder?.file(".gitkeep", "");

      // Generate blob
      const content = await zip.generateAsync({ type: "blob" });

      // Trigger download
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "iptv-auto-updater-repository.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("ZIP Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1 rounded-full border border-indigo-500/20 mb-3 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>এক ক্লিকে সম্পূর্ণ গিটহাব রিপোজিটরি জিপ ডাউনলোড</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              GitHub Repository Ready ZIP Package
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              আপনাকে একটি একটি করে ফাইল কপি-পেস্ট করতে হবে না! নিচের ডাউনলোড বাটনে ক্লিক করলে আপনার গিটহাবের জন্য প্রয়োজনীয় সকল ফাইল (.py, .yml, README) একটি ZIP ফাইলে ডাউনলোড হয়ে যাবে।
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isGenerating}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition duration-200 flex items-center justify-center space-x-2.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-5 h-5 ${isGenerating ? "animate-bounce" : ""}`} />
            <span>{isGenerating ? "ZIP তৈরি হচ্ছে..." : "ডাউনলোড Repo ZIP"}</span>
          </button>
        </div>
      </div>

      {/* Package Contents Structure Display */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <FolderTree className="w-4 h-4 text-indigo-400" />
          <span>ZIP ফাইলের ভেতরের ফোল্ডার স্ট্রাকচার:</span>
        </h3>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed">
          <div className="text-indigo-400 font-bold mb-2">📦 iptv-auto-updater-repository.zip</div>
          <div className="pl-4 border-l border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-amber-400">📁 .github/workflows/</span>
            </div>
            <div className="pl-6 flex items-center space-x-2 text-indigo-300">
              <span>📄 update_playlists.yml</span>
              <span className="text-[10px] text-slate-500 font-sans">(GitHub Actions 24h cron schedule)</span>
            </div>

            <div className="flex items-center space-x-2 text-emerald-300">
              <span>📄 update_playlists.py</span>
              <span className="text-[10px] text-slate-500 font-sans">(Python sync engine for 6 categories)</span>
            </div>

            <div className="flex items-center space-x-2 text-blue-300">
              <span>📄 README.md</span>
              <span className="text-[10px] text-slate-500 font-sans">(Full documentation & Raw M3U links)</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-purple-400">📁 playlists/</span>
              <span className="text-[10px] text-slate-500 font-sans">(Folder where .m3u files will be auto-saved)</span>
            </div>
          </div>
        </div>

        {downloadSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>সফলভাবে ZIP ডাউনলোড শুরু হয়েছে! ফাইলটি Extract করে আপনার GitHub Repo-তে Upload করুন।</span>
          </div>
        )}
      </div>

    </div>
  );
};
