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

  );
}
