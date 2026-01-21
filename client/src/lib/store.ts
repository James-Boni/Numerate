import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getRequiredXPForLevel } from './logic/progression';

// --- Types ---

export type Operation = 'add' | 'sub' | 'mul' | 'div';
export type DurationMode = 60 | 120 | 180 | 'unlimited';

export interface UserSettings {
  soundOn: boolean;
  hapticsOn: boolean;
  difficultyPreference: 'easier' | 'balanced' | 'harder';
}

export interface SessionStats {
  id: string;
  date: string; // ISO string
  durationMode: DurationMode;
  durationSecondsActual: number;
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number; // 0-1
  xpEarned: number;
  bestStreak: number;
  avgResponseTimeMs: number;
  medianMs?: number;
  variabilityMs?: number;
  throughputQps?: number;
  fluencyScore?: number;
  metBonus?: boolean;
  valid?: boolean;
}

export interface UserState {
  // Profile
  isAuthenticated: boolean;
  email: string | null;
  uid: string | null;
  createdAt: string | null;
  
  // Progress
  hasCompletedAssessment: boolean;
  currentTier: number; // 0-6
  level: number;
  lifetimeXP: number;
  streakCount: number;
  lastStreakDate: string | null; // ISO string
  
  // Data
  settings: UserSettings;
  sessions: SessionStats[];
  
  // Actions
  login: (email: string) => void;
  logout: () => void;
  completeAssessment: (tier: number, initialStats: any) => void;
  saveSession: (session: SessionStats) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetProgress: () => void;
}

// --- Store ---

export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      email: null,
      uid: null,
      createdAt: null,
      
      hasCompletedAssessment: false,
      currentTier: 0,
      level: 1,
      lifetimeXP: 0,
      streakCount: 0,
      lastStreakDate: null,
      
      settings: {
        soundOn: true,
        hapticsOn: true,
        difficultyPreference: 'balanced',
      },
      
      sessions: [],
      
      login: (email) => set({ 
        isAuthenticated: true, 
        email, 
        uid: 'mock-uid-' + Date.now(),
        createdAt: new Date().toISOString()
      }),
      
      logout: () => set({ isAuthenticated: false, email: null, uid: null }),
      
      completeAssessment: (tier, initialStats) => set({
        hasCompletedAssessment: true,
        currentTier: tier,
        // Reset streak/level on fresh start if needed, but keeping simple
      }),
      
      saveSession: (session) => set((state) => {
        // Calculate new streak
        const today = new Date().toISOString().split('T')[0];
        const lastStreak = state.lastStreakDate ? state.lastStreakDate.split('T')[0] : null;
        
        let newStreak = state.streakCount;
        let newLastStreakDate = state.lastStreakDate;
        
        if (lastStreak !== today) {
           const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
           
           if (lastStreak === yesterday) {
             newStreak += 1;
           } else if (lastStreak !== today) {
             newStreak = 1; // Reset or start
           }
           newLastStreakDate = new Date().toISOString();
        }

        const newLifetimeXP = state.lifetimeXP + session.xpEarned;
        
        // Progression level logic: allow multi-level ups
        let newLevel = state.level;
        while (newLifetimeXP >= getRequiredXPForLevel(newLevel + 1)) {
          newLevel++;
        }

        return {
          sessions: [session, ...state.sessions],
          lifetimeXP: newLifetimeXP,
          level: newLevel,
          streakCount: newStreak,
          lastStreakDate: newLastStreakDate
        };
      }),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      resetProgress: () => set({
        hasCompletedAssessment: false,
        currentTier: 0,
        level: 1,
        lifetimeXP: 0,
        sessions: [],
        streakCount: 0,
        lastStreakDate: null
      })
    }),
    {
      name: 'maths-trainer-storage',
    }
  )
);
