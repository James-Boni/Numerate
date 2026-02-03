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
  notificationsEnabled: boolean;
  notificationTime: string; // HH:MM format, e.g., "09:00"
}

export interface QuestionResult {
  operation: 'add' | 'sub' | 'mul' | 'div';
  operandA: number;
  operandB: number;
  isCorrect: boolean;
  responseTimeMs: number;
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
  questionResults?: QuestionResult[];
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
  
  // Quick Fire
  quickFireIntroSeen: boolean;
  quickFireHighScore: number;
  
  // Paywall
  hasUsedFreeDaily: boolean;
  
  // Coaching/Strategy tracking
  seenStrategies: string[]; // Strategy IDs user has already seen
  
  // Personal Records
  personalBests: {
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
  };
  
  // Skill Drill Personal Bests
  skillDrillBests: {
    rounding: { bestScore: number; bestStreak: number; gamesPlayed: number; totalCorrect: number; };
    doubling: { bestScore: number; bestStreak: number; gamesPlayed: number; totalCorrect: number; };
    halving: { bestScore: number; bestStreak: number; gamesPlayed: number; totalCorrect: number; };
  };
  
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
  resetProgress: () => { success: boolean; level?: number; error?: string };
  
  // Progression Actions
  recordAnswer: (correct: boolean, timeMs: number, templateId: string, currentTargetTimeMs: number) => void;
  toggleDebugOverlay: () => void;
  
  // Quick Fire Actions
  setQuickFireIntroSeen: () => void;
  updateQuickFireHighScore: (score: number) => boolean;
  
  // Paywall Actions
  markFreeTrialUsed: () => void;
  
  // Coaching Actions
  markStrategySeen: (strategyId: string) => void;
  
  // Personal Records Actions
  checkAndUpdatePersonalBests: (session: SessionStats) => string[];
  updateSkillDrillBests: (gameType: 'rounding' | 'doubling' | 'halving', score: number, streak: number) => boolean;
  
  // Sync Actions
  syncWithBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  
  // Dev Menu Actions (dev only)
  devSetLevel: (level: number) => void;
  devSetStartingLevel: (level: number) => void;
  devSetHasCompletedAssessment: (value: boolean) => void;
  devClearDailySessions: () => void;
  devClearQuickFireStats: () => void;
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
      
      quickFireIntroSeen: false,
      quickFireHighScore: 0,
      
      hasUsedFreeDaily: false,
      
      seenStrategies: [],
      
      personalBests: {
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
      },
      
      skillDrillBests: {
        rounding: { bestScore: 0, bestStreak: 0, gamesPlayed: 0, totalCorrect: 0 },
        doubling: { bestScore: 0, bestStreak: 0, gamesPlayed: 0, totalCorrect: 0 },
        halving: { bestScore: 0, bestStreak: 0, gamesPlayed: 0, totalCorrect: 0 },
      },
      
      progression: { ...INITIAL_PROGRESSION_STATE },
      
      settings: {
        soundOn: true,
        hapticsOn: true,
        difficultyPreference: 'balanced',
        showDebugOverlay: false,
        notificationsEnabled: true,
        notificationTime: '12:00',
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
            hasUsedFreeDaily: progress.hasUsedFreeDaily ?? false,
            seenStrategies: (progress.seenStrategies as string[]) ?? [],
            personalBests: (progress as any).personalBests ?? {
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
            },
            skillDrillBests: get().skillDrillBests,
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
              showDebugOverlay: progress.showDebugOverlay,
              notificationsEnabled: get().settings.notificationsEnabled,
              notificationTime: get().settings.notificationTime
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

      resetProgress: () => {
        const state = get();
        
        if (!state.hasCompletedAssessment || !state.startingLevel) {
          console.error('RESET_PROGRESS: Cannot reset - assessment not completed');
          return { success: false, error: 'Assessment not completed' };
        }
        
        const targetLevel = state.startingLevel;
        const targetBand = getBandFromLevel(targetLevel);
        
        console.log(`RESET_PROGRESS: Resetting to level ${targetLevel} (startingLevel preserved)`);
        
        set({
          level: targetLevel,
          xpIntoLevel: 0,
          lifetimeXP: 0,
          sessions: [],
          streakCount: 0,
          lastStreakDate: null,
          quickFireHighScore: 0,
          quickFireIntroSeen: false,
          progression: {
            ...INITIAL_PROGRESSION_STATE,
            level: targetLevel,
            band: targetBand
          }
        });
        
        return { success: true, level: targetLevel };
      },
      
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
      
      setQuickFireIntroSeen: () => set({ quickFireIntroSeen: true }),
      
      updateQuickFireHighScore: (score: number) => {
        const state = get();
        if (score > state.quickFireHighScore) {
          set({ quickFireHighScore: score });
          return true; // New high score
        }
        return false;
      },
      
      markFreeTrialUsed: () => {
        set({ hasUsedFreeDaily: true });
        // Sync with backend
        const state = get();
        if (state.uid) {
          get().syncWithBackend();
        }
      },
      
      markStrategySeen: (strategyId: string) => {
        const state = get();
        if (!state.seenStrategies.includes(strategyId)) {
          set({ seenStrategies: [...state.seenStrategies, strategyId] });
        }
      },
      
      checkAndUpdatePersonalBests: (session: SessionStats): string[] => {
        const state = get();
        const newRecords: string[] = [];
        const today = new Date().toISOString().split('T')[0];
        const currentBests = { ...state.personalBests };
        
        // Only count valid daily sessions
        if (session.sessionType !== 'daily' || session.valid === false) {
          return [];
        }
        
        // Check best streak
        if (session.bestStreak > currentBests.bestStreak) {
          currentBests.bestStreak = session.bestStreak;
          currentBests.bestStreakDate = today;
          newRecords.push('streak');
        }
        
        // Check fastest median response time (lower is better)
        if (session.medianMs && session.medianMs > 0) {
          if (currentBests.fastestMedianMs === null || session.medianMs < currentBests.fastestMedianMs) {
            currentBests.fastestMedianMs = session.medianMs;
            currentBests.fastestMedianDate = today;
            newRecords.push('speed');
          }
        }
        
        // Check highest accuracy (need min 10 questions for validity)
        if (session.totalQuestions >= 10 && session.accuracy > 0) {
          if (currentBests.highestAccuracy === null || session.accuracy > currentBests.highestAccuracy) {
            currentBests.highestAccuracy = session.accuracy;
            currentBests.highestAccuracyDate = today;
            newRecords.push('accuracy');
          }
        }
        
        // Check highest throughput (questions per second - use throughputQps or fall back to qps field from backend)
        const throughput = session.throughputQps ?? (session as any).qps;
        if (throughput && throughput > 0) {
          if (currentBests.highestThroughput === null || throughput > currentBests.highestThroughput) {
            currentBests.highestThroughput = throughput;
            currentBests.highestThroughputDate = today;
            newRecords.push('throughput');
          }
        }
        
        // Check highest fluency score
        if (session.fluencyScore && session.fluencyScore > 0) {
          if (currentBests.highestFluencyScore === null || session.fluencyScore > currentBests.highestFluencyScore) {
            currentBests.highestFluencyScore = session.fluencyScore;
            currentBests.highestFluencyDate = today;
            newRecords.push('fluency');
          }
        }
        
        if (newRecords.length > 0) {
          set({ personalBests: currentBests });
        }
        
        return newRecords;
      },
      
      updateSkillDrillBests: (gameType: 'rounding' | 'doubling' | 'halving', score: number, streak: number): boolean => {
        const state = get();
        const currentBests = { ...state.skillDrillBests };
        const gameBests = { ...currentBests[gameType] };
        let isNewBest = false;
        
        // Update games played and total correct
        gameBests.gamesPlayed += 1;
        gameBests.totalCorrect += score;
        
        // Check for new bests
        if (score > gameBests.bestScore) {
          gameBests.bestScore = score;
          isNewBest = true;
        }
        if (streak > gameBests.bestStreak) {
          gameBests.bestStreak = streak;
          isNewBest = true;
        }
        
        currentBests[gameType] = gameBests;
        set({ skillDrillBests: currentBests });
        
        return isNewBest;
      },
      
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
            hasUsedFreeDaily: state.hasUsedFreeDaily,
            seenStrategies: state.seenStrategies,
            personalBests: state.personalBests,
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
            hasUsedFreeDaily: progress.hasUsedFreeDaily ?? false,
            seenStrategies: (progress.seenStrategies as string[]) ?? [],
            personalBests: (progress as any).personalBests ?? {
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
            },
            skillDrillBests: get().skillDrillBests,
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
              showDebugOverlay: progress.showDebugOverlay,
              notificationsEnabled: get().settings.notificationsEnabled,
              notificationTime: get().settings.notificationTime
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
      },
      
      // Dev Menu Actions
      devSetLevel: (newLevel) => {
        const targetBand = getBandFromLevel(newLevel);
        console.log(`DEV_MENU: Setting level to ${newLevel}`);
        set((state) => ({
          level: newLevel,
          progression: { ...state.progression, level: newLevel, band: targetBand }
        }));
      },
      
      devSetStartingLevel: (newStartingLevel) => {
        console.log(`DEV_MENU: Setting startingLevel to ${newStartingLevel}`);
        set({ startingLevel: newStartingLevel });
      },
      
      devSetHasCompletedAssessment: (value) => {
        console.log(`DEV_MENU: Setting hasCompletedAssessment to ${value}`);
        set({ hasCompletedAssessment: value });
      },
      
      devClearDailySessions: () => {
        console.log('DEV_MENU: Clearing daily sessions');
        set((state) => ({
          sessions: state.sessions.filter(s => s.sessionType !== 'daily'),
          streakCount: 0,
          lastStreakDate: null
        }));
      },
      
      devClearQuickFireStats: () => {
        console.log('DEV_MENU: Clearing Quick Fire stats');
        set((state) => ({
          quickFireHighScore: 0,
          quickFireIntroSeen: false,
          sessions: state.sessions.filter(s => s.sessionType !== 'quick_fire')
        }));
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
