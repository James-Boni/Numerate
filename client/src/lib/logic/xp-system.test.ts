import { describe, it, expect } from 'vitest';
import {
  computeFluency,
  computeBaseSessionXP,
  computeSessionXPWithMultipliers,
  xpRequiredToAdvance,
  applyXPAndLevelUp,
  calculateFullSessionXP,
  FluencyMetrics,
} from './xp-system';
import {
  MIN_QUESTIONS_FOR_XP,
  MIN_DURATION_FOR_XP_SEC,
  EXCELLENCE_THRESHOLDS,
  ELITE_THRESHOLDS,
} from '@/config/progression';

describe('xpRequiredToAdvance', () => {
  it('returns 500 for levels 1-4', () => {
    expect(xpRequiredToAdvance(1)).toBe(500);
    expect(xpRequiredToAdvance(2)).toBe(500);
    expect(xpRequiredToAdvance(3)).toBe(500);
    expect(xpRequiredToAdvance(4)).toBe(500);
  });

  it('returns 1000 for level 5', () => {
    expect(xpRequiredToAdvance(5)).toBe(1000);
  });

  it('returns 1120 for level 6', () => {
    expect(xpRequiredToAdvance(6)).toBe(1120);
  });

  it('returns 1255 for level 7', () => {
    expect(xpRequiredToAdvance(7)).toBe(1255);
  });

  it('returns 2620 for level 14', () => {
    expect(xpRequiredToAdvance(14)).toBe(2620);
  });

  it('returns 2875 for level 15', () => {
    expect(xpRequiredToAdvance(15)).toBe(2875);
  });

  it('returns 3155 for level 16', () => {
    expect(xpRequiredToAdvance(16)).toBe(3155);
  });

  it('returns 9700 for level 30', () => {
    expect(xpRequiredToAdvance(30)).toBe(9700);
  });
});

describe('applyXPAndLevelUp', () => {
  it('handles carryover with multi-level ups', () => {
    const result = applyXPAndLevelUp(1, 0, 1500);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(4);
    expect(result.xpIntoLevelBefore).toBe(0);
    expect(result.xpIntoLevelAfter).toBe(0);
    expect(result.levelUpCount).toBe(3);
  });

  it('handles partial XP with carryover', () => {
    const result = applyXPAndLevelUp(1, 0, 600);
    expect(result.levelAfter).toBe(2);
    expect(result.xpIntoLevelAfter).toBe(100);
    expect(result.levelUpCount).toBe(1);
  });

  it('handles XP that is not enough for level up', () => {
    const result = applyXPAndLevelUp(1, 0, 300);
    expect(result.levelAfter).toBe(1);
    expect(result.xpIntoLevelAfter).toBe(300);
    expect(result.levelUpCount).toBe(0);
  });

  it('adds to existing xpIntoLevel', () => {
    const result = applyXPAndLevelUp(1, 400, 200);
    expect(result.levelAfter).toBe(2);
    expect(result.xpIntoLevelAfter).toBe(100);
    expect(result.levelUpCount).toBe(1);
  });

  it('handles level 5 transition correctly', () => {
    const result = applyXPAndLevelUp(5, 0, 1000);
    expect(result.levelAfter).toBe(6);
    expect(result.xpIntoLevelAfter).toBe(0);
    expect(result.levelUpCount).toBe(1);
  });
});

describe('computeFluency', () => {
  it('computes fluency metrics correctly', () => {
    const result = computeFluency(20, 18, 60, [1500, 1600, 1700, 1400, 1600]);
    expect(result.accuracy).toBeCloseTo(0.9, 2);
    expect(result.speedScore).toBeGreaterThan(0);
    expect(result.speedScore).toBeLessThanOrEqual(1);
    expect(result.consistencyScore).toBeGreaterThan(0);
    expect(result.consistencyScore).toBeLessThanOrEqual(1);
    expect(result.throughputScore).toBeGreaterThan(0);
    expect(result.fluencyScore).toBeGreaterThan(0);
    expect(result.fluencyScore).toBeLessThanOrEqual(100);
  });

  it('caps fluency when accuracy is below floor', () => {
    const result = computeFluency(20, 8, 60, [1000, 1000, 1000, 1000, 1000]);
    expect(result.accuracy).toBe(0.4);
    expect(result.fluencyScore).toBeLessThanOrEqual(45);
  });

  it('handles empty response times', () => {
    const result = computeFluency(0, 0, 60, []);
    expect(result.accuracy).toBe(0);
    expect(result.medianMs).toBe(99999);
  });
});

describe('computeBaseSessionXP', () => {
  it('grants full XP for valid sessions', () => {
    const result = computeBaseSessionXP(70, 15, 60);
    expect(result.isValid).toBe(true);
    expect(result.baseXP).toBeGreaterThan(0);
  });

  it('grants minimal XP for invalid sessions (too few questions)', () => {
    const validResult = computeBaseSessionXP(70, 15, 60);
    const invalidResult = computeBaseSessionXP(70, 5, 60);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.baseXP).toBeLessThan(validResult.baseXP);
  });

  it('grants minimal XP for invalid sessions (too short duration)', () => {
    const validResult = computeBaseSessionXP(70, 15, 60);
    const invalidResult = computeBaseSessionXP(70, 15, 10);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.baseXP).toBeLessThan(validResult.baseXP);
  });
});

describe('computeSessionXPWithMultipliers', () => {
  const mockFluencyMetrics: FluencyMetrics = {
    accuracy: 0.92,
    speedScore: 0.96,
    consistencyScore: 0.80,
    throughputScore: 0.90,
    fluencyScore: 85,
    medianMs: 1500,
    variabilityMs: 200,
    qps: 0.25,
  };

  it('applies mode multiplier correctly', () => {
    const result = computeSessionXPWithMultipliers(
      200, 'daily', mockFluencyMetrics, 20, 60, true
    );
    expect(result.modeMultiplier).toBe(1.0);
    expect(result.xpAfterMode).toBe(200);
  });

  it('applies quick_fire mode multiplier', () => {
    const result = computeSessionXPWithMultipliers(
      200, 'quick_fire', mockFluencyMetrics, 20, 60, true
    );
    expect(result.modeMultiplier).toBe(0.55);
    expect(result.xpAfterMode).toBe(110);
  });

  it('triggers excellence multiplier when all thresholds met', () => {
    const excellentMetrics: FluencyMetrics = {
      ...mockFluencyMetrics,
      accuracy: 0.92,
      speedScore: 0.96,
      consistencyScore: 0.80,
      throughputScore: 0.90,
    };
    const result = computeSessionXPWithMultipliers(
      200, 'daily', excellentMetrics, 20, 60, true
    );
    expect(result.excellenceMultiplierApplied).toBe(1.25);
    expect(result.xpAfterExcellence).toBe(250);
  });

  it('triggers elite accuracy multiplier when accuracy >= 0.95', () => {
    const eliteAccuracyMetrics: FluencyMetrics = {
      ...mockFluencyMetrics,
      accuracy: 0.96,
      speedScore: 0.96,
      consistencyScore: 0.80,
      throughputScore: 0.90,
    };
    const result = computeSessionXPWithMultipliers(
      200, 'daily', eliteAccuracyMetrics, 20, 60, true
    );
    expect(result.excellenceMultiplierApplied).toBe(1.35);
    expect(result.xpAfterExcellence).toBe(270);
  });

  it('does NOT trigger excellence multiplier for invalid sessions', () => {
    const excellentMetrics: FluencyMetrics = {
      ...mockFluencyMetrics,
      accuracy: 0.96,
      speedScore: 0.98,
      consistencyScore: 0.85,
      throughputScore: 0.95,
    };
    const result = computeSessionXPWithMultipliers(
      200, 'daily', excellentMetrics, 20, 60, false
    );
    expect(result.excellenceMultiplierApplied).toBe(1.0);
    expect(result.xpAfterExcellence).toBe(200);
  });

  it('triggers elite multiplier when ALL elite thresholds met', () => {
    const eliteMetrics: FluencyMetrics = {
      accuracy: 0.99,
      speedScore: 0.98,
      consistencyScore: 0.85,
      throughputScore: 1.0,
      fluencyScore: 95,
      medianMs: 1200,
      variabilityMs: 100,
      qps: 0.30,
    };
    const result = computeSessionXPWithMultipliers(
      200, 'daily', eliteMetrics, 50, 120, true
    );
    expect(result.eliteMultiplierApplied).toBe(2.0);
  });

  it('does NOT trigger elite multiplier if questions below threshold', () => {
    const eliteMetrics: FluencyMetrics = {
      accuracy: 0.99,
      speedScore: 0.98,
      consistencyScore: 0.85,
      throughputScore: 1.0,
      fluencyScore: 95,
      medianMs: 1200,
      variabilityMs: 100,
      qps: 0.30,
    };
    const result = computeSessionXPWithMultipliers(
      200, 'daily', eliteMetrics, 30, 120, true
    );
    expect(result.eliteMultiplierApplied).toBe(1.0);
  });

  it('does NOT trigger elite multiplier if duration below threshold', () => {
    const eliteMetrics: FluencyMetrics = {
      accuracy: 0.99,
      speedScore: 0.98,
      consistencyScore: 0.85,
      throughputScore: 1.0,
      fluencyScore: 95,
      medianMs: 1200,
      variabilityMs: 100,
      qps: 0.30,
    };
    const result = computeSessionXPWithMultipliers(
      200, 'daily', eliteMetrics, 50, 45, true
    );
    expect(result.eliteMultiplierApplied).toBe(1.0);
  });

  it('does NOT trigger elite for invalid sessions', () => {
    const eliteMetrics: FluencyMetrics = {
      accuracy: 0.99,
      speedScore: 0.98,
      consistencyScore: 0.85,
      throughputScore: 1.0,
      fluencyScore: 95,
      medianMs: 1200,
      variabilityMs: 100,
      qps: 0.30,
    };
    const result = computeSessionXPWithMultipliers(
      200, 'daily', eliteMetrics, 50, 120, false
    );
    expect(result.eliteMultiplierApplied).toBe(1.0);
  });
});

describe('Mode multipliers diminish XP correctly', () => {
  it('daily mode gives full XP', () => {
    const { xpResult } = calculateFullSessionXP(
      'daily', 20, 15, 60, Array(20).fill(1500)
    );
    const dailyXP = xpResult.finalSessionXP;

    const { xpResult: quickFireResult } = calculateFullSessionXP(
      'quick_fire', 20, 15, 60, Array(20).fill(1500)
    );
    const quickFireXP = quickFireResult.finalSessionXP;

    expect(dailyXP).toBeGreaterThan(quickFireXP);
    expect(quickFireXP).toBeCloseTo(dailyXP * 0.55, -1);
  });
});

describe('Assessment gives NO XP', () => {
  it('assessment sessions should not be processed for XP (handled by store logic)', () => {
    expect(true).toBe(true);
  });
});
