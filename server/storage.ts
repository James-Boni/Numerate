import { 
  users,
  userProgress,
  sessions,
  type User, 
  type InsertUser,
  type UserProgress,
  type InsertUserProgress,
  type Session,
  type InsertSession
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  createUser(): Promise<User>;
  
  getUserProgress(userId: string): Promise<UserProgress | undefined>;
  upsertUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  getUserSessions(userId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(): Promise<User> {
    const [user] = await db.insert(users).values({}).returning();
    return user;
  }

  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    return progress || undefined;
  }

  async upsertUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [result] = await db
      .insert(userProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: userProgress.userId,
        set: {
          ...progress,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(sessions.date);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [result] = await db
      .insert(sessions)
      .values(session)
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
