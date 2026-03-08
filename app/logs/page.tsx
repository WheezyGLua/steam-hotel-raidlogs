import { db } from '../../db';
import { raids } from '../../db/schema';
import { desc, ilike, or } from 'drizzle-orm';
import Link from 'next/link';
import { Search, Calendar, Users, Target } from 'lucide-react';

export const revalidate = 0; // Dynamic rendering for search

export default async function GlobalLogsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q || '';

  const results = await db.query.raids.findMany({
    where: query
      ? or(
          ilike(raids.customName, `%${query}%`),
          ilike(raids.guildName, `%${query}%`)
        )
      : undefined,
    orderBy: [desc(raids.createdAt)],
    limit: 50,
    with: {
      encounters: {
        columns: {
          id: true,
          bossName: true,
          kill: true
        }
      }
    }
  });

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Discover Raids</h1>
          <p className="text-slate-400 mt-2">Latest high-level 3.3.5 parses globally.</p>
        </div>
        <form className="mt-4 md:mt-0 relative w-full md:w-96" action="/logs" method="GET">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
           <input 
              name="q"
              defaultValue={query}
              type="text" 
              placeholder="Search by Guild or Raid Name..." 
              className="w-full bg-[#131A2B] border border-indigo-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
           />
        </form>
      </div>

      <div className="grid gap-4">
        {results.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xl font-semibold text-slate-300">No raids found</h3>
            <p className="text-slate-500 mt-2">Try uploading one or searching something else.</p>
          </div>
        ) : (
          results.map(raid => {
             const kills = raid.encounters.filter(e => e.kill).length;
             const wipes = raid.encounters.filter(e => !e.kill).length;
             return (
              <Link href={`/logs/${raid.id}`} key={raid.id}>
                <div className="group p-5 rounded-2xl bg-[#131A2B]/80 hover:bg-[#1C2539] border border-indigo-500/10 hover:border-indigo-500/30 backdrop-blur-md transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 cursor-pointer">
                  
                  <div className="w-full md:w-1/3">
                    <h2 className="text-lg font-bold text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-1">{raid.customName}</h2>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Calendar size={14} /> 
                      {raid.createdAt.toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-6 items-center w-full md:w-2/3 md:justify-end">
                     <div className="text-center">
                        <span className="block text-xl font-bold text-green-400">{kills}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kills</span>
                     </div>
                     <div className="text-center">
                        <span className="block text-xl font-bold text-red-400">{wipes}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Wipes</span>
                     </div>
                     <div className="hidden md:flex flex-wrap gap-2 justify-end max-w-xs pl-4 border-l border-slate-700/50">
                        {raid.encounters.slice(0,4).map(e => (
                          <span key={e.id} className={`text-xs px-2 py-0.5 rounded border ${e.kill ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                             {e.bossName}
                          </span>
                        ))}
                        {raid.encounters.length > 4 && <span className="text-xs px-2 py-0.5 rounded border bg-slate-500/10 border-slate-500/20 text-slate-400">+{raid.encounters.length - 4}</span>}
                     </div>
                  </div>
                </div>
              </Link>
             )
          })
        )}
      </div>
    </div>
  );
}
