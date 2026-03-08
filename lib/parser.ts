import * as readline from 'readline';
import { Readable } from 'stream';

// Types representing our parsed data
export type ParsedPlayer = {
  id: string; // GUID, or generated
  name: string;
  class?: string;
};

export type ParsedEncounter = {
  id: string; // UUID generated locally
  bossName: string;
  startTime: Date;
  endTime: Date | null;
  kill: boolean;
  events: ParsedCombatEvent[];
};

export type ParsedCombatEvent = {
  timestamp: Date;
  eventType: string;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  spellId?: number;
  amount?: number;
  isCrit?: boolean;
};

type ParserState = {
  players: Map<string, ParsedPlayer>;
  encounters: ParsedEncounter[];
  activeEncounter: ParsedEncounter | null;
  globalEventsCount: number;
};

// Year isn't in 3.3.5 logs (e.g., "8/19 14:04:14.000"), so we assume current year,
// or calculate cross-year boundary if it flips from 12/31 to 1/1
const currentYear = new Date().getFullYear();

function parseTimestamp(dateStr: string): Date {
  // Format: "8/19 14:04:14.000"
  return new Date(`${currentYear}/${dateStr}`);
}

/**
 * High performance stream parser for 3.3.5 combat logs.
 */
export async function parseLogStream(stream: Readable): Promise<ParserState> {
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  const state: ParserState = {
    players: new Map(),
    encounters: [],
    activeEncounter: null,
    globalEventsCount: 0,
  };

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;

      // Extract Timestamp and CSV Payload
      // 8/19 14:04:14.000  SPELL_DAMAGE,0x...
      const splitIdx = line.indexOf('  ');
      if (splitIdx === -1) continue;

      const dateStr = line.substring(0, splitIdx);
      const csvData = line.substring(splitIdx + 2);

      const timestamp = parseTimestamp(dateStr);
      
      // Fast CSV split handling quotes naive approach
      // In a production app, we'd use a robust regex or char-by-char scanner if quotes contain commas
      const parts = csvData.split(',');
      if (parts.length < 3) continue;

      const eventType = parts[0];
      
      // Basic heuristic for 3.3.5 ENCOUNTER_START if present, or fallback
      if (eventType === 'ENCOUNTER_START') {
        const encounterName = parts[2]?.replace(/"/g, '');
        state.activeEncounter = {
          id: crypto.randomUUID(),
          bossName: encounterName || 'Unknown Boss',
          startTime: timestamp,
          endTime: null,
          kill: false,
          events: [],
        };
        state.encounters.push(state.activeEncounter);
        continue;
      }

      if (eventType === 'ENCOUNTER_END') {
        if (state.activeEncounter) {
          state.activeEncounter.endTime = timestamp;
          // kill relies on the 5th param (1 = kill, 0 = wipe)
          const success = parts[5];
          state.activeEncounter.kill = success === '1';
          state.activeEncounter = null;
        }
        continue;
      }

      // If we're not in an encounter, we can skip standard events to save DB space
      // Or we can keep them for trash. For this plan, let's only keep encounter events to avoid DB bloat.
      if (!state.activeEncounter) continue;

      // Basic Event Parsing
      const sourceId = parts[1];
      const sourceName = parts[2]?.replace(/"/g, '');
      const targetId = parts[3];
      const targetName = parts[4]?.replace(/"/g, '');

      // Store players
      if (sourceName && sourceName !== 'nil' && sourceId && sourceId.startsWith('0x00')) {
        if (!state.players.has(sourceName)) {
            state.players.set(sourceName, { id: crypto.randomUUID(), name: sourceName });
        }
      }
      if (targetName && targetName !== 'nil' && targetId && targetId.startsWith('0x00')) {
         if (!state.players.has(targetName)) {
            state.players.set(targetName, { id: crypto.randomUUID(), name: targetName });
         }
      }

      const sourcePlayer = sourceName ? state.players.get(sourceName) : null;
      const targetPlayer = targetName ? state.players.get(targetName) : null;

      // Parse amounts based on event type
      let amount: number | undefined;
      let isCrit: boolean | undefined;
      let spellId: number | undefined;

      const isDamage = eventType.includes('_DAMAGE') && !eventType.includes('ENV_');
      const isHeal = eventType.includes('_HEAL');

      if (isDamage || isHeal) {
         if (eventType.startsWith('SWING_')) {
            // SWING_DAMAGE,SourceGUID,SourceName,TargetGUID,TargetName,Amount,Overkill,School,Resist,Block,Absorb,Critical,Glancing,Crushing
            amount = parseInt(parts[5] || '0', 10);
            isCrit = parts[11] === '1' || parts[11] === 'true'; // Varies by patch/addon
         } else {
            // SPELL_DAMAGE,Source...,Target...,SpellID,SpellName,SpellSchool,Amount,...
            spellId = parseInt(parts[5] || '0', 10);
            amount = parseInt(parts[8] || '0', 10);
            isCrit = parts[14] === '1' || parts[14] === 'true';
         }
      }

      // We only care about damage/heals to keep the DB size reasonable for now
      if (amount !== undefined) {
         state.activeEncounter.events.push({
            timestamp,
            eventType,
            sourcePlayerId: sourcePlayer?.id,
            targetPlayerId: targetPlayer?.id,
            spellId,
            amount,
            isCrit,
         });
         state.globalEventsCount++;
      }
    }
  } catch (err) {
    console.error('Parser error:', err);
    throw err;
  }

  return state;
}
