import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getRequiredXPForLevel } from './logic/progression';
import { xpRequiredToAdvance, applyXPAndLevelUp } from './logic/xp-system';
import { 
  ProgressionState, 
  INITIAL_PROGRESSION_STATE, 
  computePerformanceScore, 
  updateSkillRating, 
  updateAntiWhiplash,
  getBandFromLevel
} from './logic/difficulty';
import { api } from './api';

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
  sessionType: string;
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
  speedScore?: number;
  consistencyScore?: number;
  throughputScore?: number;
  fluencyScore?: number;
  baseSessionXP?: number;
  modeMultiplier?: number;
  excellenceMultiplierApplied?: number;
  eliteMultiplierApplied?: number;
  finalSessionXP?: number;
  levelBefore?: number;
  levelAfter?: number;
  levelUpCount?: number;
  xpIntoLevelBefore?: number;
  xpIntoLevelAfter?: number;
  metBonus?: boolean;
  valid?: boolean;
  responseTimes?: number[];
}

export interface UserState {
  // Profile
  isAuthenticated: boolean;
  email: string | null;
  uid: string | null;
  createdAt: string | null;
  
  // Progress
  hasCompletedAssessment: boolean;
  currentTier: number; // Legacy 0-6, now maps to competenceGroup
  competenceGroup: number; // 1-10 from assessment
  startingLevel: number; // Initial level from assessment
  level: number;
  xpIntoLevel: number; // Carryover XP within current level
  lifetimeXP: number;
  streakCount: number;
  lastStreakDate: string | null; // ISO string
  
  // New Progression Engine State
  progression: ProgressionState;

  // Data
  settings: UserSettings;
  sessions: SessionStats[];
  
  // Sync state
  isSyncing: boolean;
  lastSyncError: string | null;
  
  // Actions
  login: (email: string) => void;
  logout: () => void;
  completeAssessment: (competenceGroup: number, startingLevel: number, initialStats: any) => void;
  saveSession: (session: SessionStats) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetProgress: () => void;
  
  // Progression Actions
  recordAnswer: (correct: boolean, timeMs: number, templateId: string, currentTargetTimeMs: number) => void;
  toggleDebugOverlay: () => void;
  
  // Sync Actions
  syncWithBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
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
      competenceGroup: 1,
      startingLevel: 1,
      level: 1,
      xpIntoLevel: 0,
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
      
      isSyncing: false,
      lastSyncError: null,
      
      login: async (email) => {
        try {
          const { user, progress } = await api.createUser();
          
          set({ 
            isAuthenticated: true, 
            email, 
            uid: user.id,
            createdAt: user.createdAt.toString(),
            hasCompletedAssessment: progress.hasCompletedAssessment,
            level: progress.level,
            lifetimeXP: progress.lifetimeXP,
            streakCount: progress.streakCount,
            lastStreakDate: progress.lastStreakDate?.toString() || null,
            progression: {
              level: progress.level,
              band: progress.band,
              srGlobal: progress.srGlobal,
              difficultyStep: progress.difficultyStep,
              goodStreak: progress.goodStreak,
              poorStreak: progress.poorStreak,
              history: progress.history as any[]
            },
            settings: {
              soundOn: progress.soundOn,
              hapticsOn: progress.hapticsOn,
              difficultyPreference: progress.difficultyPreference as 'easier' | 'balanced' | 'harder',
              showDebugOverlay: progress.showDebugOverlay
            }
          });
        } catch (error) {
          console.error('Login error:', error);
          set({ lastSyncError: 'Failed to login' });
        }
      },
      
      logout: () => set({ isAuthenticated: false, email: null, uid: null }),
      
      completeAssessment: (competenceGroup, startingLevel, initialStats) => set((state) => ({
        hasCompletedAssessment: true,
        currentTier: competenceGroup,
        competenceGroup: competenceGroup,
        startingLevel: startingLevel,
        level: startingLevel,
        xpIntoLevel: 0, // Assessment gives NO XP
        progression: {
          ...state.progression,
          level: startingLevel,
          band: getBandFromLevel(startingLevel),
        },
      })),
      
      saveSession: async (session) => {
        const state = get();
        
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
             newStreak = 1;
           }
           newLastStreakDate = new Date().toISOString();
        }

        // Apply XP with the new carryover system
        const levelResult = applyXPAndLevelUp(
          state.level,
          state.xpIntoLevel,
          session.xpEarned
        );
        
        const newLifetimeXP = state.lifetimeXP + session.xpEarned;
        const newBand = getBandFromLevel(levelResult.levelAfter);

        set({
          sessions: [session, ...state.sessions],
          lifetimeXP: newLifetimeXP,
          level: levelResult.levelAfter,
          xpIntoLevel: levelResult.xpIntoLevelAfter,
          streakCount: newStreak,
          lastStreakDate: newLastStreakDate,
          progression: {
            ...state.progression,
            level: levelResult.levelAfter,
            band: newBand
          }
        });
        
        if (state.uid) {
          try {
            await api.createSession(state.uid, {
              sessionType: session.sessionType ?? 'daily',
              durationMode: session.durationMode === 'unlimited' ? 9999 : session.durationMode,
              durationSecondsActual: session.durationSecondsActual,
              totalQuestions: session.totalQuestions,
              correctQuestions: session.correctQuestions,
              accuracy: session.accuracy,
              xpEarned: session.xpEarned,
              bestStreak: session.bestStreak,
              avgResponseTimeMs: session.avgResponseTimeMs,
              medianMs: session.medianMs ?? null,
              variabilityMs: session.variabilityMs ?? null,
              qps: session.throughputQps ?? null,
              speedScore: session.speedScore ?? null,
              consistencyScore: session.consistencyScore ?? null,
              throughputScore: session.throughputScore ?? null,
              fluencyScore: session.fluencyScore ?? null,
              baseSessionXP: session.baseSessionXP ?? null,
              modeMultiplier: session.modeMultiplier ?? null,
              excellenceMultiplierApplied: session.excellenceMultiplierApplied ?? null,
              eliteMultiplierApplied: session.eliteMultiplierApplied ?? null,
              finalSessionXP: session.finalSessionXP ?? null,
              levelBefore: session.levelBefore ?? null,
              levelAfter: session.levelAfter ?? null,
              levelUpCount: session.levelUpCount ?? null,
              xpIntoLevelBefore: session.xpIntoLevelBefore ?? null,
              xpIntoLevelAfter: session.xpIntoLevelAfter ?? null,
              valid: session.valid ?? true
            });
            
            await get().syncWithBackend();
          } catch (error) {
            console.error('Failed to save session to backend:', error);
            set({ lastSyncError: 'Failed to save session' });
          }
        }
      },
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      resetProgress: () => set({
        hasCompletedAssessment: false,
        currentTier: 0,
        competenceGroup: 1,
        startingLevel: 1,
        level: 1,
        xpIntoLevel: 0,
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
      })),
      
      syncWithBackend: async () => {
        const state = get();
        if (!state.uid) return;
        
        try {
          set({ isSyncing: true, lastSyncError: null });
          
          await api.updateProgress(state.uid, {
            userId: state.uid,
            hasCompletedAssessment: state.hasCompletedAssessment,
            level: state.level,
            lifetimeXP: state.lifetimeXP,
            streakCount: state.streakCount,
            lastStreakDate: state.lastStreakDate ? new Date(state.lastStreakDate) : null,
            band: state.progression.band,
            srGlobal: state.progression.srGlobal,
            difficultyStep: state.progression.difficultyStep,
            goodStreak: state.progression.goodStreak,
            poorStreak: state.progression.poorStreak,
            history: state.progression.history as any,
            soundOn: state.settings.soundOn,
            hapticsOn: state.settings.hapticsOn,
            difficultyPreference: state.settings.difficultyPreference,
            showDebugOverlay: state.settings.showDebugOverlay
          });
          
          set({ isSyncing: false });
        } catch (error) {
          console.error('Sync error:', error);
          set({ isSyncing: false, lastSyncError: 'Failed to sync with backend' });
        }
      },
      
      loadFromBackend: async () => {
        const state = get();
        if (!state.uid) return;
        
        try {
          set({ isSyncing: true, lastSyncError: null });
          
          let progress;
          let sessions;
          
          try {
            [progress, sessions] = await Promise.all([
              api.getProgress(state.uid),
              api.getSessions(state.uid)
            ]);
          } catch (error: any) {
            if (error.message?.includes('404') || error.message?.includes('not found')) {
              console.log('[RECOVERY] User not found in backend, creating new user');
              const { user, progress: newProgress } = await api.createUser();
              set({
                uid: user.id,
                createdAt: user.createdAt.toString(),
                isSyncing: false
              });
              return;
            }
            throw error;
          }
          
          set({
            hasCompletedAssessment: progress.hasCompletedAssessment,
            level: progress.level,
            lifetimeXP: progress.lifetimeXP,
            streakCount: progress.streakCount,
            lastStreakDate: progress.lastStreakDate?.toString() || null,
            progression: {
              level: progress.level,
              band: progress.band,
              srGlobal: progress.srGlobal,
              difficultyStep: progress.difficultyStep,
              goodStreak: progress.goodStreak,
              poorStreak: progress.poorStreak,
              history: progress.history as any[]
            },
            settings: {
              soundOn: progress.soundOn,
              hapticsOn: progress.hapticsOn,
              difficultyPreference: progress.difficultyPreference as 'easier' | 'balanced' | 'harder',
              showDebugOverlay: progress.showDebugOverlay
            },
            sessions: sessions.map(s => ({
              id: s.id,
              date: s.date.toString(),
              sessionType: s.sessionType ?? 'daily',
              durationMode: s.durationMode === 9999 ? 'unlimited' as const : s.durationMode as 60 | 120 | 180,
              durationSecondsActual: s.durationSecondsActual,
              totalQuestions: s.totalQuestions,
              correctQuestions: s.correctQuestions,
              accuracy: s.accuracy,
              xpEarned: s.xpEarned,
              bestStreak: s.bestStreak,
              avgResponseTimeMs: s.avgResponseTimeMs,
              medianMs: s.medianMs ?? undefined,
              variabilityMs: s.variabilityMs ?? undefined,
              throughputQps: s.qps ?? undefined,
              speedScore: s.speedScore ?? undefined,
              consistencyScore: s.consistencyScore ?? undefined,
              throughputScore: s.throughputScore ?? undefined,
              fluencyScore: s.fluencyScore ?? undefined,
              baseSessionXP: s.baseSessionXP ?? undefined,
              modeMultiplier: s.modeMultiplier ?? undefined,
              excellenceMultiplierApplied: s.excellenceMultiplierApplied ?? undefined,
              eliteMultiplierApplied: s.eliteMultiplierApplied ?? undefined,
              finalSessionXP: s.finalSessionXP ?? undefined,
              levelBefore: s.levelBefore ?? undefined,
              levelAfter: s.levelAfter ?? undefined,
              levelUpCount: s.levelUpCount ?? undefined,
              xpIntoLevelBefore: s.xpIntoLevelBefore ?? undefined,
              xpIntoLevelAfter: s.xpIntoLevelAfter ?? undefined,
              metBonus: s.excellenceMultiplierApplied ? s.excellenceMultiplierApplied > 1 : undefined,
              valid: s.valid
            })),
            isSyncing: false
          });
        } catch (error) {
          console.error('Load error:', error);
          set({ isSyncing: false, lastSyncError: 'Failed to load from backend' });
        }
      }
    }),
    {
      name: 'maths-trainer-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migration: Sync legacy level to progression level if needed
          if (state.level > 1 && state.progression.level === 1) {
            state.progression.level = state.level;
            state.progression.band = getBandFromLevel(state.level);
            console.log('[MIGRATION] Synced progression level to:', state.level);
          }
        }
      }
    }
  )
);
