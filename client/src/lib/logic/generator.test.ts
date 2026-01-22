import { describe, it, expect } from 'vitest';
import { generateQuestionForLevel, GeneratedQuestionMeta } from './generator_adapter';
import { getDifficultyParams, getOperationWeights } from './difficulty';

describe('Generator Distribution Tests', () => {
  describe('Level 10 Mixed Ops', () => {
    it('should generate mixed operations at level 10 (not just addition)', () => {
      const counts = { add: 0, sub: 0, mul: 0, div: 0 };
      const operands: number[] = [];
      
      for (let i = 0; i < 500; i++) {
        const q = generateQuestionForLevel(10, []);
        counts[q.meta.operation]++;
        operands.push(q.meta.operandA, q.meta.operandB);
      }
      
      const total = counts.add + counts.sub + counts.mul + counts.div;
      const subPct = (counts.sub / total) * 100;
      
      expect(subPct).toBeGreaterThanOrEqual(25);
      expect(counts.add).not.toBe(total);
      expect(Math.max(...operands)).toBeGreaterThanOrEqual(20);
      expect(counts.div).toBe(0);
      expect(counts.mul).toBe(0);
    });
    
    it('should have correct operation weights at level 10', () => {
      const weights = getOperationWeights(10);
      expect(weights.add).toBe(0.55);
      expect(weights.sub).toBe(0.45);
      expect(weights.mul).toBe(0);
      expect(weights.div).toBe(0);
    });
    
    it('should have correct difficulty params at level 10', () => {
      const params = getDifficultyParams(10);
      expect(params.level).toBe(10);
      expect(params.band).toBe(0);
      expect(params.maxAddSub).toBe(50);
      expect(params.allowMul).toBe(false);
      expect(params.allowDiv).toBe(false);
    });
  });
  
  describe('Level 25 Mixed Ops', () => {
    it('should generate all four operations at level 25', () => {
      const counts = { add: 0, sub: 0, mul: 0, div: 0 };
      const divResults: number[] = [];
      
      for (let i = 0; i < 500; i++) {
        const q = generateQuestionForLevel(25, []);
        counts[q.meta.operation]++;
        
        if (q.meta.operation === 'div') {
          divResults.push(q.meta.answer);
        }
      }
      
      const total = counts.add + counts.sub + counts.mul + counts.div;
      
      expect((counts.add / total) * 100).toBeGreaterThanOrEqual(10);
      expect((counts.sub / total) * 100).toBeGreaterThanOrEqual(10);
      expect((counts.mul / total) * 100).toBeGreaterThanOrEqual(10);
      expect((counts.div / total) * 100).toBeGreaterThanOrEqual(10);
      
      divResults.forEach(result => {
        expect(Number.isInteger(result)).toBe(true);
      });
    });
    
    it('should have correct operation weights at level 25', () => {
      const weights = getOperationWeights(25);
      expect(weights.add).toBe(0.30);
      expect(weights.sub).toBe(0.30);
      expect(weights.mul).toBe(0.25);
      expect(weights.div).toBe(0.15);
    });
    
    it('should have correct difficulty params at level 25', () => {
      const params = getDifficultyParams(25);
      expect(params.level).toBe(25);
      expect(params.band).toBe(2);
      expect(params.maxAddSub).toBe(110);
      expect(params.allowMul).toBe(true);
      expect(params.allowDiv).toBe(true);
      expect(params.maxMulA).toBeGreaterThan(5);
      expect(params.maxDivDivisor).toBeGreaterThan(2);
    });
  });
  
  describe('Level progression affects difficulty', () => {
    it('should increase maxAddSub as level increases', () => {
      const level1 = getDifficultyParams(1);
      const level10 = getDifficultyParams(10);
      const level20 = getDifficultyParams(20);
      const level30 = getDifficultyParams(30);
      
      expect(level1.maxAddSub).toBe(14);
      expect(level10.maxAddSub).toBe(50);
      expect(level20.maxAddSub).toBe(90);
      expect(level30.maxAddSub).toBe(130);
    });
    
    it('should unlock multiplication at level 13', () => {
      const level12 = getDifficultyParams(12);
      const level13 = getDifficultyParams(13);
      
      expect(level12.allowMul).toBe(false);
      expect(level13.allowMul).toBe(true);
    });
    
    it('should unlock division at level 21', () => {
      const level20 = getDifficultyParams(20);
      const level21 = getDifficultyParams(21);
      
      expect(level20.allowDiv).toBe(false);
      expect(level21.allowDiv).toBe(true);
    });
  });
  
  describe('Operation weight transitions', () => {
    it('should have mostly addition at level 1-5', () => {
      const weights = getOperationWeights(3);
      expect(weights.add).toBe(0.80);
      expect(weights.sub).toBe(0.20);
    });
    
    it('should have balanced add/sub at level 6-12', () => {
      const weights = getOperationWeights(8);
      expect(weights.add).toBe(0.55);
      expect(weights.sub).toBe(0.45);
    });
    
    it('should introduce multiplication at level 13-20', () => {
      const weights = getOperationWeights(15);
      expect(weights.add).toBe(0.40);
      expect(weights.sub).toBe(0.35);
      expect(weights.mul).toBe(0.25);
      expect(weights.div).toBe(0);
    });
    
    it('should have all four ops at level 21-30', () => {
      const weights = getOperationWeights(25);
      expect(weights.add).toBe(0.30);
      expect(weights.sub).toBe(0.30);
      expect(weights.mul).toBe(0.25);
      expect(weights.div).toBe(0.15);
    });
    
    it('should have all four ops at level 31+', () => {
      const weights = getOperationWeights(50);
      expect(weights.add).toBe(0.25);
      expect(weights.sub).toBe(0.25);
      expect(weights.mul).toBe(0.30);
      expect(weights.div).toBe(0.20);
    });
  });
});
