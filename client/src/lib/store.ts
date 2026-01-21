import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getRequiredXPForLevel } from './logic/progression';
import { 
  ProgressionState, 
  INITIAL_PROGRESSION_STATE, 
  computePerformanceScore, 
  updateSkillRating, 
  updateAntiWhiplash,
  getBandFromLevel
} from './logic/difficulty';

// --- Types ---

export type Operation = 'add' | 'sub' | 'mul' | 'div';
export type DurationMode = 60 | 120 | 180 | 'unlimited';

export interface UserSettings {
  soundOn: boolean;
  hapticsOn: boolean;
  difficultyPreference: 'easier' | 'balanced' | 'harder';
  showDebugOverlay: boolean;
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
  currentTier: number; // Legacy 0-6
  level: number;
  lifetimeXP: number;
  streakCount: number;
  lastStreakDate: string | null; // ISO string
  
  // New Progression Engine State
  progression: ProgressionState;

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
  
  // Progression Actions
  recordAnswer: (correct: boolean, timeMs: number, templateId: string, currentTargetTimeMs: number) => void;
  toggleDebugOverlay: () => void;
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
      
      progression: { ...INITIAL_PROGRESSION_STATE },
      
      settings: {
        soundOn: true,
        hapticsOn: true,
        difficultyPreference: 'balanced',
        showDebugOverlay: false,
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
        
        // Update Band based on Level
        const newBand = getBandFromLevel(newLevel);

        return {
          sessions: [session, ...state.sessions],
          lifetimeXP: newLifetimeXP,
          level: newLevel,
          streakCount: newStreak,
          lastStreakDate: newLastStreakDate,
          progression: {
            ...state.progression,
            level: newLevel,
            band: newBand
          }
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
        lastStreakDate: null,
        progression: { ...INITIAL_PROGRESSION_STATE }
      }),
      
      recordAnswer: (correct, timeMs, templateId, currentTargetTimeMs) => set((state) => {
        const { progression } = state;
        const ps = computePerformanceScore(correct, timeMs, currentTargetTimeMs);
        
        // Update SR
        // Use band or tier as approximation for difficultyTier in the K formula
        // K = 6 + difficultyTier. Using band for now as per "Part 2" MVP
        const newSR = updateSkillRating(progression.srGlobal, ps, progression.band);
        
        // Anti-whiplash
        const { newStep, newGood, newPoor } = updateAntiWhiplash(
          progression.difficultyStep,
          progression.goodStreak,
          progression.poorStreak,
          correct,
          timeMs,
          currentTargetTimeMs
        );
        
        // Update History
        const newHistory = [
          { correct, timeMs, templateId, dp: 0, ps }, // DP 0 for now
          ...progression.history
        ].slice(0, 20);
        
        return {
          progression: {
            ...progression,
            srGlobal: newSR,
            difficultyStep: newStep,
            goodStreak: newGood,
            poorStreak: newPoor,
            history: newHistory
          }
        };
      }),
      
      toggleDebugOverlay: () => set(state => ({
        settings: { ...state.settings, showDebugOverlay: !state.settings.showDebugOverlay }
      }))
    }),
    {
      name: 'maths-trainer-storage',
    }
  )
);
