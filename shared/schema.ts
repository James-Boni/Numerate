import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authToken: varchar("auth_token").unique(),
  appleSubjectId: varchar("apple_subject_id").unique(),
  email: varchar("email"),
  entitlementTier: text("entitlement_tier").notNull().default('free'),
  entitlementStatus: text("entitlement_status").notNull().default('none'),
  entitlementSource: text("entitlement_source").notNull().default('none'),
  entitlementExpiresAt: timestamp("entitlement_expires_at"),
  originalTransactionId: varchar("original_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  hasCompletedAssessment: boolean("has_completed_assessment").notNull().default(false),
  level: integer("level").notNull().default(1),
  xpIntoLevel: integer("xp_into_level").notNull().default(0),
  competenceGroup: integer("competence_group").notNull().default(1),
  startingLevel: integer("starting_level").notNull().default(1),
  lifetimeXP: integer("lifetime_xp").notNull().default(0),
  streakCount: integer("streak_count").notNull().default(0),
  lastStreakDate: timestamp("last_streak_date"),
  
  // Progression Engine State
  band: integer("band").notNull().default(0),
  srGlobal: real("sr_global").notNull().default(50),
  difficultyStep: integer("difficulty_step").notNull().default(0),
  goodStreak: integer("good_streak").notNull().default(0),
  poorStreak: integer("poor_streak").notNull().default(0),
  history: jsonb("history").$type<Array<{
    correct: boolean;
    timeMs: number;
    templateId?: string;
    dp?: number;
    ps?: number;
  }>>().notNull().default([]),
  
  lifetimeQuestions: integer("lifetime_questions").notNull().default(0),
  
  // Paywall
  hasUsedFreeDaily: boolean("has_used_free_daily").notNull().default(false),
  
  // Coaching
  seenStrategies: jsonb("seen_strategies").$type<string[]>().notNull().default([]),
  
  // Personal Records
  personalBests: jsonb("personal_bests").$type<{
    bestStreak: number;
    bestStreakDate: string | null;
    fastestMedianMs: number | null;
    fastestMedianDate: string | null;
    highestAccuracy: number | null;
    highestAccuracyDate: string | null;
    highestThroughput: number | null;
    highestThroughputDate: string | null;
    highestFluencyScore: number | null;
    highestFluencyDate: string | null;
  }>().notNull().default({
    bestStreak: 0,
    bestStreakDate: null,
    fastestMedianMs: null,
    fastestMedianDate: null,
    highestAccuracy: null,
    highestAccuracyDate: null,
    highestThroughput: null,
    highestThroughputDate: null,
    highestFluencyScore: null,
    highestFluencyDate: null
  }),
  
  // Settings
  soundOn: boolean("sound_on").notNull().default(true),
  hapticsOn: boolean("haptics_on").notNull().default(true),
  difficultyPreference: text("difficulty_preference").notNull().default('balanced'),
  showDebugOverlay: boolean("show_debug_overlay").notNull().default(false),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionType: text("session_type").notNull().default("daily"),
  date: timestamp("date").notNull().defaultNow(),
  durationMode: integer("duration_mode").notNull(),
  durationSecondsActual: integer("duration_seconds_actual").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctQuestions: integer("correct_questions").notNull(),
  accuracy: real("accuracy").notNull(),
  medianMs: integer("median_ms"),
  variabilityMs: real("variability_ms"),
  qps: real("qps"),
  speedScore: real("speed_score"),
  consistencyScore: real("consistency_score"),
  throughputScore: real("throughput_score"),
  fluencyScore: real("fluency_score"),
  baseSessionXP: integer("base_session_xp"),
  modeMultiplier: real("mode_multiplier"),
  excellenceMultiplierApplied: real("excellence_multiplier_applied"),
  eliteMultiplierApplied: real("elite_multiplier_applied"),
  finalSessionXP: integer("final_session_xp"),
  xpEarned: integer("xp_earned").notNull(),
  levelBefore: integer("level_before"),
  levelAfter: integer("level_after"),
  levelUpCount: integer("level_up_count"),
  xpIntoLevelBefore: integer("xp_into_level_before"),
  xpIntoLevelAfter: integer("xp_into_level_after"),
  bestStreak: integer("best_streak").notNull(),
  avgResponseTimeMs: integer("avg_response_time_ms").notNull(),
  valid: boolean("valid").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  date: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
