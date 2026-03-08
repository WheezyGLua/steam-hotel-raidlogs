import UploadForm from '../components/UploadForm';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center">
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Analyze <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">3.3.5 Raids</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          The fastest and most beautiful combat log analyzer for World of Warcraft WotLK 3.3.5. 
          Upload your combat log to instantly see damage meters, healing parses, and wipe analysis.
        </p>
      </div>

      <UploadForm />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto text-center opacity-80">
         <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <h3 className="text-xl font-bold text-slate-200 mb-2 mt-2">Lightning Fast</h3>
            <p className="text-sm text-slate-400">Node stream processing handles 500MB+ logs instantly without crashing the browser.</p>
         </div>
         <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <h3 className="text-xl font-bold text-slate-200 mb-2 mt-2">Deep Insights</h3>
            <p className="text-sm text-slate-400">Review precise damage and healing mechanics per encounter, directly inspired by WCL.</p>
         </div>
         <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <h3 className="text-xl font-bold text-slate-200 mb-2 mt-2">Globally Searchable</h3>
            <p className="text-sm text-slate-400">All uploads are indexed. Search by guild, custom raid name, or specific encounters.</p>
         </div>
      </div>
    </div>
  );
}
