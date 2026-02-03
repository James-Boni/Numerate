import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserProgressSchema, insertSessionSchema, type User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  const user = await storage.getUserByAuthToken(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }
  
  req.user = user;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const user = await storage.createUser();
      await storage.upsertUserProgress({ userId: user.id });
      const progress = await storage.getUserProgress(user.id);
      
      res.json({ 
        user,
        progress,
        authToken: user.authToken
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { authToken } = req.body;
      
      if (!authToken) {
        return res.status(400).json({ error: "Auth token required" });
      }
      
      const user = await storage.getUserByAuthToken(authToken);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid auth token" });
      }
      
      const progress = await storage.getUserProgress(user.id);
      const sessions = await storage.getUserSessions(user.id);
      
      res.json({ user, progress, sessions });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const progress = await storage.getUserProgress(user.id);
      const sessions = await storage.getUserSessions(user.id);
      
      res.json({ user, progress, sessions });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/apple", async (req, res) => {
    try {
      const { identityToken, authorizationCode, email } = req.body;
      
      res.status(501).json({ 
        error: "Apple Sign-In not yet implemented",
        message: "This endpoint will verify Apple identity tokens and link/create accounts"
      });
    } catch (error) {
      console.error('Error with Apple auth:', error);
      res.status(500).json({ error: "Failed to process Apple auth" });
    }
  });

  app.post("/api/auth/link-apple", authMiddleware, async (req, res) => {
    try {
      const { identityToken, authorizationCode, email } = req.body;
      const user = req.user!;
      
      res.status(501).json({ 
        error: "Apple linking not yet implemented",
        message: "This endpoint will link Apple ID to existing guest account"
      });
    } catch (error) {
      console.error('Error linking Apple:', error);
      res.status(500).json({ error: "Failed to link Apple account" });
    }
  });
  
  app.post("/api/sync/progress", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      
      const existingProgress = await storage.getUserProgress(user.id);
      
      const progressData = {
        ...(existingProgress || {}),
        ...req.body,
        userId: user.id,
      };
      
      const progress = await storage.upsertUserProgress(progressData);
      
      res.json({ progress });
    } catch (error) {
      console.error('Error syncing progress:', error);
      res.status(500).json({ error: "Failed to sync progress" });
    }
  });

  app.get("/api/sync/progress", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const progress = await storage.getUserProgress(user.id);
      const sessions = await storage.getUserSessions(user.id);
      
      res.json({ progress, sessions });
    } catch (error) {
      console.error('Error fetching sync data:', error);
      res.status(500).json({ error: "Failed to fetch sync data" });
    }
  });

  app.post("/api/sync/session", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const sessionData = {
        ...req.body,
        userId: user.id,
      };
      
      const validatedData = insertSessionSchema.parse(sessionData);
      const session = await storage.createSession(validatedData);
      
      res.json({ session });
    } catch (error) {
      console.error('Error syncing session:', error);
      res.status(500).json({ error: "Failed to sync session" });
    }
  });
  
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
      const body = { ...req.body };
      
      // Convert date strings to Date objects for timestamp fields
      if (body.lastStreakDate && typeof body.lastStreakDate === 'string') {
        body.lastStreakDate = new Date(body.lastStreakDate);
      }
      
      const validatedData = insertUserProgressSchema.parse({
        ...body,
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
