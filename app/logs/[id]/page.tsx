import { db } from '../../../db';
import { raids, encounters, combatEvents } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, ShieldAlert, Skull, Activity, Swords } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Dynamic route

export default async function RaidViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raidId } = await params;

  const raid = await db.query.raids.findFirst({
    where: eq(raids.id, raidId),
    with: {
      encounters: {
         columns: { id: true, bossName: true, kill: true, startTime: true, endTime: true },
         orderBy: (encounters, { asc }) => [asc(encounters.startTime)],
      }
    }
  });

  if (!raid) return notFound();

  // For V1, we load the encounters list. 
  // Normally we would query the specific `amount` sums per Encounter here, 
  // but let's do a fast aggregator query if there are encounters to show basic numbers.

  let totals = { damage: 0, healing: 0 };
  
  if (raid.encounters.length > 0) {
     const resParams = raid.encounters.map(e => e.id);
     
     // Drizzle raw SQL for aggregation
     const stats = await db.execute<{
        event_type: string;
        total_amount: number;
     }>(sql`
        SELECT event_type, SUM(amount) as total_amount 
        FROM combat_events 
        WHERE encounter_id IN ${sql`(${sql.join(resParams, sql`, `)})`}
        AND amount IS NOT NULL
        GROUP BY event_type
     `);
     
     stats.rows.forEach(row => {
        if (row.event_type.includes('_DAMAGE') && !row.event_type.includes('ENV_')) totals.damage += Number(row.total_amount);
        if (row.event_type.includes('_HEAL')) totals.healing += Number(row.total_amount);
     });
  }

  // Formatting helpers
  const formatM = (num: number) => num >= 1000000 ? (num / 1000000).toFixed(1) + 'M' : num >= 1000 ? (num/1000).toFixed(1) + 'k' : num.toString();
  const formatTime = (ms: number) => {
     const s = Math.floor(ms / 1000);
     const m = Math.floor(s / 60);
     return `${m}:${(s % 60).toString().padStart(2,'0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-6">
      <Link href="/logs" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 mb-8 transition-colors">
         <ArrowLeft size={16} /> Back to Discover
      </Link>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A233A] to-[#0F1423] border border-indigo-500/20 p-8 md:p-12 shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Swords size={200} />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               <h1 className="text-3xl md:text-5xl font-black text-white">{raid.customName}</h1>
               <div className="flex gap-4 mt-4 text-sm font-medium text-slate-400 items-center">
                  <div className="flex items-center gap-1.5"><Clock size={16} className="text-indigo-400"/> {raid.createdAt.toLocaleString()}</div>
                  {raid.guildName && <div className="flex items-center gap-1.5"><ShieldAlert size={16} className="text-yellow-400"/> {raid.guildName}</div>}
               </div>
            </div>
            
            <div className="flex gap-4 p-4 rounded-xl bg-black/30 backdrop-blur-md border border-white/5">
                <div className="text-center px-4">
                  <div className="text-2xl font-black text-red-400">{formatM(totals.damage)}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1"><Activity size={10} className="inline mr-1 -mt-0.5"/> Damage</div>
                </div>
                <div className="w-px bg-white/10"></div>
                <div className="text-center px-4">
                  <div className="text-2xl font-black text-emerald-400">{formatM(totals.healing)}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1"><Activity size={10} className="inline mr-1 -mt-0.5"/> Healing</div>
                </div>
            </div>
         </div>
      </div>

      {/* Encounters List */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-3">
          <Skull className="text-slate-500" /> Raid Encounters
        </h2>
        
        {raid.encounters.length === 0 ? (
           <div className="p-8 text-center text-slate-500 bg-[#131A2B] rounded-2xl border border-white/5">
              No encounters parsed for this log file. (Check if log contained ENCOUNTER_START/END)
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {raid.encounters.map(enc => {
                 const durationMs = enc.endTime.getTime() - enc.startTime.getTime();
                 
                 return (
                    <div key={enc.id} className="group relative overflow-hidden p-6 rounded-2xl bg-[#131A2B]/80 hover:bg-[#1C2539] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer">
                       {/* Background Kill/Wipe Glow */}
                       <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 group-hover:opacity-20 transition-opacity -mr-16 -mt-16 ${enc.kill ? 'bg-green-500' : 'bg-red-500'}`}></div>
                       
                       <div className="flex justify-between items-start mb-4 relative z-10">
                          <h3 className="text-xl font-bold text-slate-200">{enc.bossName}</h3>
                          <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-lg border ${enc.kill ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                             {enc.kill ? 'Kill' : `Wipe (${formatTime(durationMs)})`}
                          </span>
                       </div>
                       
                       <div className="text-xs text-slate-500 flex justify-between items-center relative z-10">
                          <span>{enc.startTime.toLocaleTimeString()}</span>
                          <span className="text-indigo-400 group-hover:underline">View Parse →</span>
                       </div>
                    </div>
                 )
              })}
           </div>
        )}
      </div>

    </div>
  );
}
