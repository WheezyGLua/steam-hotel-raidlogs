import { db } from '../db';
import { raids, encounters, players, combatEvents } from '../db/schema';
import { parseLogStream } from './parser';
import type { Readable } from 'stream';

export async function processAndSaveLog(stream: Readable, customRaidName: string): Promise<string> {
  // 1. Parse the stream into memory
  // For production with massive logs, this could be further optimized by streaming inserts directly,
  // but for V1 we keep parsed state in memory. A 100MB log might result in a few MBs of JS objects if we filter only encounters.
  const state = await parseLogStream(stream);

  // 2. Wrap all inserts in a transaction for atomicity
  return await db.transaction(async (tx) => {
    
    // Determine overall raid start/end based on encounters
    let raidStart: Date | undefined;
    let raidEnd: Date | undefined;
    
    if (state.encounters.length > 0) {
      raidStart = new Date(Math.min(...state.encounters.map(e => e.startTime.getTime())));
      raidEnd = new Date(Math.max(...state.encounters.map(e => e.endTime?.getTime() || e.startTime.getTime())));
    }

    // Insert Raid
    const [newRaid] = await tx.insert(raids).values({
      customName: customRaidName,
      startTime: raidStart,
      endTime: raidEnd,
    }).returning({ id: raids.id });

    // Insert Players
    if (state.players.size > 0) {
      const playerValues = Array.from(state.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        class: p.class,
      }));
      
      // Batch player inserts if large, but usually < 40 for a raid
      await tx.insert(players).values(playerValues).onConflictDoNothing({ target: players.id });
    }

    // Insert Encounters and their Combat Events
    if (state.encounters.length > 0) {
      const encounterValues = state.encounters.map(enc => ({
        id: enc.id,
        raidId: newRaid.id,
        bossName: enc.bossName,
        startTime: enc.startTime,
        endTime: enc.endTime || enc.startTime,
        kill: enc.kill,
      }));
      await tx.insert(encounters).values(encounterValues);

      // Insert Combat Events in chunks to avoid Postgres max parameter limits (65535 parameters max)
      // Since combatEvents has ~8 fields, we can safely insert ~8000 rows per chunk
      const CHUNK_SIZE = 5000;
      
      for (const enc of state.encounters) {
        for (let i = 0; i < enc.events.length; i += CHUNK_SIZE) {
          const chunk = enc.events.slice(i, i + CHUNK_SIZE);
          await tx.insert(combatEvents).values(
            chunk.map(ev => ({
              encounterId: enc.id,
              timestamp: ev.timestamp,
              eventType: ev.eventType,
              sourcePlayerId: ev.sourcePlayerId,
              targetPlayerId: ev.targetPlayerId,
              spellId: ev.spellId,
              amount: ev.amount,
              isCrit: ev.isCrit,
            }))
          );
        }
      }
    }
    
    return newRaid.id;
  });
}
