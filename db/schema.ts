import { pgTable, uuid, text, timestamp, boolean, integer, bigint, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const raids = pgTable('raids', {
  id: uuid('id').defaultRandom().primaryKey(),
  customName: text('custom_name').notNull(),
  guildName: text('guild_name'),
  uploaderId: text('uploader_id'),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('raids_custom_name_idx').on(table.customName),
  index('raids_guild_name_idx').on(table.guildName),
]);

export const encounters = pgTable('encounters', {
  id: uuid('id').defaultRandom().primaryKey(),
  raidId: uuid('raid_id').references(() => raids.id, { onDelete: 'cascade' }).notNull(),
  bossName: text('boss_name').notNull(),
  zoneId: integer('zone_id'),
  kill: boolean('kill'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
}, (table) => [
  index('encounters_raid_id_idx').on(table.raidId),
  index('encounters_boss_name_idx').on(table.bossName),
]);

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  class: text('class'),
}, (table) => [
  index('players_name_idx').on(table.name),
]);

export const combatEvents = pgTable('combat_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  eventType: text('event_type').notNull(),
  sourcePlayerId: uuid('source_player_id').references(() => players.id),
  targetPlayerId: uuid('target_player_id').references(() => players.id),
  spellId: integer('spell_id'),
  amount: integer('amount'),
  isCrit: boolean('is_crit'),
}, (table) => [
  index('combat_events_encounter_id_idx').on(table.encounterId),
  index('combat_events_timestamp_idx').on(table.timestamp),
]);

// Relationships
export const raidsRelations = relations(raids, ({ many }) => ({
  encounters: many(encounters),
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  raid: one(raids, {
    fields: [encounters.raidId],
    references: [raids.id],
  }),
  combatEvents: many(combatEvents),
}));

export const combatEventsRelations = relations(combatEvents, ({ one }) => ({
  encounter: one(encounters, {
    fields: [combatEvents.encounterId],
    references: [encounters.id],
  }),
  sourcePlayer: one(players, {
    fields: [combatEvents.sourcePlayerId],
    references: [players.id],
    relationName: 'source',
  }),
  targetPlayer: one(players, {
    fields: [combatEvents.targetPlayerId],
    references: [players.id],
    relationName: 'target',
  }),
}));
