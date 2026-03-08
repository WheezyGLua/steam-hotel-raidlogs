import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WoW Onyxia Logs',
  description: 'Upload and analyze Warcraft 3.3.5 combat logs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0B0F19] text-slate-200 min-h-screen selection:bg-indigo-500/30">
        <nav className="border-b border-indigo-500/10 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-2xl">⚔️</span> Onyxia Logs
            </a>
            <div className="flex gap-6 text-sm font-medium">
              <a href="/" className="hover:text-indigo-400 transition-colors">Upload</a>
              <a href="/logs" className="hover:text-cyan-400 transition-colors">Discover Raids</a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
