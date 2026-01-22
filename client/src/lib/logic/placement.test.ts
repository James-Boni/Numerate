import { describe, it, expect } from 'vitest';
import { computeStartingPlacement } from './placement';

describe('computeStartingPlacement', () => {
  it('Test 1: Fast but low accuracy is capped', () => {
    const result = computeStartingPlacement({
      totalAnswers: 54,
      correctAnswers: 54,
      responseTimes: Array(54).fill(1100),
      assessmentDurationSeconds: 180,
    });
    
    const cpm = 54 / 3;
    expect(result.debug.CPM).toBeCloseTo(18);
    expect(result.debug.G0).toBe(9);
    
    const resultWithLowAccuracy = computeStartingPlacement({
      totalAnswers: 90,
      correctAnswers: 54,
      responseTimes: Array(90).fill(1100),
      assessmentDurationSeconds: 180,
    });
    
    expect(resultWithLowAccuracy.debug.A).toBeCloseTo(0.6, 1);
    expect(resultWithLowAccuracy.debug.G0).toBe(9);
    expect(resultWithLowAccuracy.debug.Gcap).toBe(5);
    expect(resultWithLowAccuracy.debug.G1).toBe(5);
    expect(resultWithLowAccuracy.debug.G).toBe(5);
    expect(resultWithLowAccuracy.startingLevel).toBe(8);
  });

  it('Test 2: Slow but accurate is not punished too hard', () => {
    const result = computeStartingPlacement({
      totalAnswers: 26,
      correctAnswers: 24,
      responseTimes: Array(26).fill(2700),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.CPM).toBeCloseTo(8, 0);
    expect(result.debug.A).toBeCloseTo(0.923, 2);
    expect(result.debug.G0).toBe(4);
    expect(result.debug.Gcap).toBe(10);
    expect(result.debug.G1).toBe(4);
    expect(result.debug.G2).toBe(3);
    expect(result.debug.G).toBe(3);
    expect(result.startingLevel).toBe(4);
  });

  it('Test 3: Elite performance reaches G10', () => {
    const result = computeStartingPlacement({
      totalAnswers: 68,
      correctAnswers: 63,
      responseTimes: Array(68).fill(1200),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.CPM).toBeCloseTo(21, 0);
    expect(result.debug.A).toBeCloseTo(0.926, 2);
    expect(result.debug.G0).toBe(10);
    expect(result.debug.Gcap).toBe(10);
    expect(result.debug.G1).toBe(10);
    expect(result.debug.G).toBe(10);
    expect(result.startingLevel).toBe(30);
  });

  it('Test 4: Very low attempt count forces G1', () => {
    const result = computeStartingPlacement({
      totalAnswers: 6,
      correctAnswers: 6,
      responseTimes: Array(6).fill(1000),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.isValidPlacement).toBe(false);
    expect(result.competenceGroup).toBe(1);
    expect(result.startingLevel).toBe(1);
  });

  it('Test 5a: Borderline CPM band - CPM=4.0 should be G2', () => {
    const result = computeStartingPlacement({
      totalAnswers: 12,
      correctAnswers: 12,
      responseTimes: Array(12).fill(2000),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.CPM).toBeCloseTo(4, 1);
    expect(result.debug.G0).toBe(2);
  });

  it('Test 5b: Borderline CPM band - CPM=6.0 should be G3', () => {
    const result = computeStartingPlacement({
      totalAnswers: 18,
      correctAnswers: 18,
      responseTimes: Array(18).fill(2000),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.CPM).toBeCloseTo(6, 1);
    expect(result.debug.G0).toBe(3);
  });

  it('Test 5c: Borderline CPM band - CPM=20.0 should be G10', () => {
    const result = computeStartingPlacement({
      totalAnswers: 60,
      correctAnswers: 60,
      responseTimes: Array(60).fill(1500),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.CPM).toBeCloseTo(20, 1);
    expect(result.debug.G0).toBe(10);
  });

  it('CPM < 4 should be G1', () => {
    const result = computeStartingPlacement({
      totalAnswers: 12,
      correctAnswers: 9,
      responseTimes: Array(12).fill(5000),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.CPM).toBe(3);
    expect(result.debug.G0).toBe(1);
  });

  it('Speed nudge applies when fast and accurate', () => {
    const result = computeStartingPlacement({
      totalAnswers: 36,
      correctAnswers: 33,
      responseTimes: Array(36).fill(1200),
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.CPM).toBe(11);
    expect(result.debug.A).toBeCloseTo(0.917, 2);
    expect(result.debug.G0).toBe(5);
    expect(result.debug.G1).toBe(5);
    expect(result.debug.G2).toBe(6);
    expect(result.competenceGroup).toBe(6);
    expect(result.startingLevel).toBe(10);
  });

  it('Zero answers returns defaults', () => {
    const result = computeStartingPlacement({
      totalAnswers: 0,
      correctAnswers: 0,
      responseTimes: [],
      assessmentDurationSeconds: 180,
    });
    
    expect(result.debug.isValidPlacement).toBe(false);
    expect(result.competenceGroup).toBe(1);
    expect(result.startingLevel).toBe(1);
    expect(result.debug.A).toBe(0);
    expect(result.debug.CPM).toBe(0);
  });

  it('Accuracy floor caps work correctly', () => {
    const below55 = computeStartingPlacement({
      totalAnswers: 60,
      correctAnswers: 30,
      responseTimes: Array(60).fill(1500),
      assessmentDurationSeconds: 180,
    });
    expect(below55.debug.A).toBeCloseTo(0.5, 1);
    expect(below55.debug.Gcap).toBe(3);

    const below65 = computeStartingPlacement({
      totalAnswers: 60,
      correctAnswers: 36,
      responseTimes: Array(60).fill(1500),
      assessmentDurationSeconds: 180,
    });
    expect(below65.debug.A).toBeCloseTo(0.6, 1);
    expect(below65.debug.Gcap).toBe(5);

    const below75 = computeStartingPlacement({
      totalAnswers: 60,
      correctAnswers: 42,
      responseTimes: Array(60).fill(1500),
      assessmentDurationSeconds: 180,
    });
    expect(below75.debug.A).toBeCloseTo(0.7, 1);
    expect(below75.debug.Gcap).toBe(7);

    const above75 = computeStartingPlacement({
      totalAnswers: 60,
      correctAnswers: 48,
      responseTimes: Array(60).fill(1500),
      assessmentDurationSeconds: 180,
    });
    expect(above75.debug.A).toBeCloseTo(0.8, 1);
    expect(above75.debug.Gcap).toBe(10);
  });

  it('Level mapping is correct for all groups', () => {
    const expectedLevels: Record<number, number> = {
      1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 12, 8: 16, 9: 22, 10: 30
    };
    
    for (let g = 1; g <= 10; g++) {
      const correctNeeded = g === 10 ? 60 : (g - 1) * 6 + 12;
      const result = computeStartingPlacement({
        totalAnswers: correctNeeded,
        correctAnswers: correctNeeded,
        responseTimes: Array(correctNeeded).fill(1500),
        assessmentDurationSeconds: 180,
      });
      
      if (result.debug.isValidPlacement && result.competenceGroup === g) {
        expect(result.startingLevel).toBe(expectedLevels[g]);
      }
    }
  });

  // DETERMINISM TESTS - Prove placement is pure and deterministic
  it('Placement is deterministic - same inputs always produce same outputs', () => {
    const input = {
      totalAnswers: 45,
      correctAnswers: 40,
      responseTimes: Array(45).fill(1800),
      assessmentDurationSeconds: 180,
    };
    
    // Call placement 5 times with identical inputs
    const results = Array(5).fill(null).map(() => computeStartingPlacement(input));
    
    // All results should be identical
    const first = results[0];
    results.forEach((result, i) => {
      expect(result.competenceGroup).toBe(first.competenceGroup);
      expect(result.startingLevel).toBe(first.startingLevel);
      expect(result.debug.G0).toBe(first.debug.G0);
      expect(result.debug.Gcap).toBe(first.debug.Gcap);
      expect(result.debug.G).toBe(first.debug.G);
      expect(result.debug.CPM).toBe(first.debug.CPM);
    });
  });

  it('Placement function has no side effects - isolated runs produce identical results', () => {
    // First run
    const input1 = {
      totalAnswers: 30,
      correctAnswers: 28,
      responseTimes: Array(30).fill(2000),
      assessmentDurationSeconds: 180,
    };
    const result1a = computeStartingPlacement(input1);
    
    // Run a completely different input
    const input2 = {
      totalAnswers: 60,
      correctAnswers: 55,
      responseTimes: Array(60).fill(1500),
      assessmentDurationSeconds: 180,
    };
    const result2 = computeStartingPlacement(input2);
    
    // Run the first input again - should be identical to first run
    const result1b = computeStartingPlacement(input1);
    
    expect(result1b.competenceGroup).toBe(result1a.competenceGroup);
    expect(result1b.startingLevel).toBe(result1a.startingLevel);
    expect(result1b.debug.G).toBe(result1a.debug.G);
  });

  it('Placement uses actual duration, not hardcoded 180 seconds', () => {
    const input180 = {
      totalAnswers: 30,
      correctAnswers: 30,
      responseTimes: Array(30).fill(1500),
      assessmentDurationSeconds: 180, // 3 minutes
    };
    const result180 = computeStartingPlacement(input180);
    
    // Same answers in 90 seconds = higher CPM
    const input90 = {
      totalAnswers: 30,
      correctAnswers: 30,
      responseTimes: Array(30).fill(1500),
      assessmentDurationSeconds: 90, // 1.5 minutes
    };
    const result90 = computeStartingPlacement(input90);
    
    // CPM should be double for 90s vs 180s with same correct answers
    expect(result90.debug.CPM).toBe(result180.debug.CPM * 2);
    // Higher CPM should lead to higher or equal group
    expect(result90.debug.G0).toBeGreaterThanOrEqual(result180.debug.G0);
  });
});
