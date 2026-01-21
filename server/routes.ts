import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserProgressSchema, insertSessionSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/user", async (req, res) => {
    try {
      const user = await storage.createUser();
      
      await storage.upsertUserProgress({ userId: user.id });
      
      const progress = await storage.getUserProgress(user.id);
      
      res.json({ user, progress });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  app.get("/api/progress/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const progress = await storage.getUserProgress(userId);
      
      if (!progress) {
        return res.status(404).json({ error: "Progress not found" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error('Error fetching progress:', error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });
  
  app.post("/api/progress/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const validatedData = insertUserProgressSchema.parse({
        ...req.body,
        userId,
      });
      
      const progress = await storage.upsertUserProgress(validatedData);
      res.json(progress);
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });
  
  app.get("/api/sessions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });
  
  app.post("/api/sessions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const validatedData = insertSessionSchema.parse({
        ...req.body,
        userId,
      });
      
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  return httpServer;
}
