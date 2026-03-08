"use client";

import { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [raidName, setRaidName] = useState('Onyxia GDKP - Sunday');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      if (f.name.endsWith('.txt')) setFile(f);
      else setError("Must be a .txt combat log file");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Please select a file first.');
    if (!raidName.trim()) return setError('Please provide a raid name.');

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('log', file);
    formData.append('raidName', raidName);

    try {
      const res = await fetch('/api/logs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      router.push(`/logs/${data.raidId}`);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      <form onSubmit={handleUpload} className="space-y-6">
        
        {/* Raid Naming Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Raid Name</label>
          <input 
            type="text" 
            value={raidName}
            onChange={e => setRaidName(e.target.value)}
            className="w-full bg-[#131A2B] border border-indigo-500/20 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            placeholder="e.g. ICC 25 HC - Guild Run"
            required
            disabled={uploading}
          />
        </div>

        {/* Drag & Drop Area */}
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            isDragging 
              ? 'border-indigo-400 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]' 
              : file 
                ? 'border-green-500/50 bg-green-500/5' 
                : 'border-slate-700 bg-[#131A2B]/50 hover:bg-[#131A2B] hover:border-slate-600'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
              setError(null);
            }} 
            className="hidden" 
            accept=".txt"
            disabled={uploading}
          />

          <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
            {file ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 shadow-[0_0_15px_max(0,rgba(34,197,94,0.2))]">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-200">{file.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-200">Upload WoW Combat Log</h3>
                  <p className="text-sm text-slate-400 mt-1">Drag and drop your WoWCombatLog.txt here, or click to browse.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={!file || uploading}
          className="w-full relative group overflow-hidden rounded-xl p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl opacity-70 group-hover:opacity-100 transition-opacity duration-300"></span>
          <div className="relative bg-[#0B0F19] rounded-xl px-4 py-3 flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition-all duration-300">
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin text-white" />
                <span className="font-semibold text-white">Parsing and Saving Log...</span>
              </>
            ) : (
              <>
                <FileText size={20} className="text-white" />
                <span className="font-semibold text-white">Analyze Raid Log</span>
              </>
            )}
          </div>
        </button>
      </form>
    </div>
  );
}
