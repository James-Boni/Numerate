import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  hasCompletedAssessment: boolean("has_completed_assessment").notNull().default(false),
  level: integer("level").notNull().default(1),
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
  date: timestamp("date").notNull().defaultNow(),
  durationMode: integer("duration_mode").notNull(),
  durationSecondsActual: integer("duration_seconds_actual").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctQuestions: integer("correct_questions").notNull(),
  accuracy: real("accuracy").notNull(),
  xpEarned: integer("xp_earned").notNull(),
  bestStreak: integer("best_streak").notNull(),
  avgResponseTimeMs: integer("avg_response_time_ms").notNull(),
  medianMs: integer("median_ms"),
  variabilityMs: real("variability_ms"),
  throughputQps: real("throughput_qps"),
  fluencyScore: real("fluency_score"),
  metBonus: boolean("met_bonus"),
  valid: boolean("valid").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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
