import { PLACEMENT_CONFIG as CFG } from '@/config/progression';

export interface AssessmentMetrics {
  totalAnswers: number;
  correctAnswers: number;
  responseTimes: number[];
  assessmentDurationSeconds: number;
}

export interface PlacementDebug {
  N: number;
  C: number;
  A: number;
  CPM: number;
  medianMs: number;
  G0: number;
  Gcap: number;
  G1: number;
  G2: number;
  G: number;
  Lstart: number;
  isValidPlacement: boolean;
}

export interface PlacementResult {
  competenceGroup: number;
  startingLevel: number;
  metrics: {
    totalAnswers: number;
    correctAnswers: number;
    accuracy: number;
    cpm: number;
    medianMs: number;
  };
  debug: PlacementDebug;
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 99999;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const getBaseGroupFromCPM = (cpm: number): number => {
  const bands = CFG.CPM_BANDS;
  if (cpm < bands[0]) return 1;
  if (cpm < bands[1]) return 2;
  if (cpm < bands[2]) return 3;
  if (cpm < bands[3]) return 4;
  if (cpm < bands[4]) return 5;
  if (cpm < bands[5]) return 6;
  if (cpm < bands[6]) return 7;
  if (cpm < bands[7]) return 8;
  if (cpm < bands[8]) return 9;
  return 10;
};

const getAccuracyCap = (accuracy: number): number => {
  if (accuracy < 0.55) return CFG.ACCURACY_CAPS.BELOW_55;
  if (accuracy < 0.65) return CFG.ACCURACY_CAPS.BELOW_65;
  if (accuracy < 0.75) return CFG.ACCURACY_CAPS.BELOW_75;
  return CFG.ACCURACY_CAPS.DEFAULT;
};

export const computeStartingPlacement = (metrics: AssessmentMetrics): PlacementResult => {
  const { totalAnswers, correctAnswers, responseTimes, assessmentDurationSeconds } = metrics;
  
  const N = totalAnswers;
  const C = correctAnswers;
  const A = N > 0 ? C / N : 0;
  const durationMinutes = assessmentDurationSeconds / 60;
  const CPM = durationMinutes > 0 ? C / durationMinutes : 0;
  const medianMs = computeMedian(responseTimes);
  
  const isValidPlacement = N >= CFG.MIN_ANSWERS_FOR_PLACEMENT;
  
  if (!isValidPlacement) {
    return {
      competenceGroup: 1,
      startingLevel: 1,
      metrics: { totalAnswers: N, correctAnswers: C, accuracy: A, cpm: CPM, medianMs },
      debug: {
        N, C, A, CPM, medianMs,
        G0: 1, Gcap: 1, G1: 1, G2: 1, G: 1, Lstart: 1,
        isValidPlacement: false,
      },
    };
  }
  
  const G0 = getBaseGroupFromCPM(CPM);
  const Gcap = getAccuracyCap(A);
  const G1 = Math.min(G0, Gcap);
  
  let G2 = G1;
  if (medianMs <= CFG.SPEED_NUDGE.FAST_THRESHOLD_MS && A >= CFG.SPEED_NUDGE.FAST_ACCURACY_MIN) {
    G2 = Math.min(10, G2 + 1);
  }
  if (medianMs >= CFG.SPEED_NUDGE.SLOW_THRESHOLD_MS) {
    G2 = Math.max(1, G2 - 1);
  }
  
  const G = clamp(G2, 1, 10);
  const Lstart = clamp(CFG.GROUP_TO_LEVEL[G] ?? 1, 1, CFG.MAX_START_LEVEL);
  
  return {
    competenceGroup: G,
    startingLevel: Lstart,
    metrics: {
      totalAnswers: N,
      correctAnswers: C,
      accuracy: A,
      cpm: CPM,
      medianMs,
    },
    debug: {
      N, C, A, CPM, medianMs,
      G0, Gcap, G1, G2, G, Lstart,
      isValidPlacement,
    },
  };
};

export const getPlacementMessage = (group: number): string => {
  if (group <= 2) {
    return "We've identified a good starting point for you. Consistent practice will build your confidence and speed. Let's begin.";
  }
  if (group <= 4) {
    return "Your foundations are solid. With focused practice, you'll develop reliable fluency. Ready when you are.";
  }
  if (group <= 6) {
    return "You've demonstrated capable arithmetic skills. We'll help you refine your speed and consistency.";
  }
  if (group <= 8) {
    return "Strong performance. You're ready for challenging problems that will push your limits.";
  }
  return "Excellent results. You'll start at an advanced level with complex problems suited to your abilities.";
};
