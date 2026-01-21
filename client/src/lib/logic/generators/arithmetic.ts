import { TemplateFamily } from '../curriculum';
import { isTrivial } from './filters';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ADDITION FAMILIES
export const ADD_FAMILIES: Record<string, TemplateFamily> = {
  ADD_1D_1D: {
    id: 'ADD_1D_1D',
    name: '1-Digit Addition',
    variants: [
      {
        index: 0, description: "Sums up to 10", dp: 1, targetTimeMs: 1500,
        generate: () => {
          let a, b;
          do {
            a = randomInt(2, 5);
            b = randomInt(2, 5);
          } while(isTrivial('add', [a, b], 0));
          return { text: `${a} + ${b}`, answer: a + b };
        }
      },
      {
        index: 1, description: "Sums up to 15", dp: 2, targetTimeMs: 1800,
        generate: () => {
          let a, b;
          do {
             a = randomInt(4, 9);
             b = randomInt(3, 6);
          } while(isTrivial('add', [a, b], 0));
          return { text: `${a} + ${b}`, answer: a + b };
        }
      },
      {
        index: 2, description: "Sums 10-18 (Bridge 10)", dp: 3, targetTimeMs: 2000,
        generate: () => {
          let a, b;
          do {
            a = randomInt(6, 9);
            b = randomInt(5, 9);
          } while(isTrivial('add', [a, b], 0));
          return { text: `${a} + ${b}`, answer: a + b };
        }
      },
       {
        index: 3, description: "Mixed 1D high", dp: 3, targetTimeMs: 1800,
        generate: () => {
          let a, b;
          do {
            a = randomInt(5, 9);
            b = randomInt(5, 9);
          } while(isTrivial('add', [a, b], 0));
          return { text: `${a} + ${b}`, answer: a + b };
        }
      },
      {
        index: 4, description: "Fast Recall 1D", dp: 3, targetTimeMs: 1200, // Speed pressure
        generate: () => {
          let a, b;
          do {
            a = randomInt(3, 9);
            b = randomInt(3, 9);
          } while(isTrivial('add', [a, b], 0));
          return { text: `${a} + ${b}`, answer: a + b };
        }
      }
    ]
  },
  ADD_2D_2D: {
    id: 'ADD_2D_2D',
    name: '2-Digit Addition',
    variants: [
      {
        index: 0, description: "No Carry (e.g. 21+34)", dp: 3, targetTimeMs: 3000,
        generate: () => {
          // Generate such that digits don't sum > 9
          let A, B;
          do {
            const a1 = randomInt(1, 4), a2 = randomInt(1, 4);
            const b1 = randomInt(1, 4), b2 = randomInt(1, 4);
            A = a1 * 10 + a2;
            B = b1 * 10 + b2;
          } while(isTrivial('add', [A, B], 1));
          return { text: `${A} + ${B}`, answer: A + B };
        }
      },
      {
        index: 1, description: "Carry in Ones (Low)", dp: 4, targetTimeMs: 3500,
        generate: () => {
          let a, b;
          do {
             a = randomInt(15, 45);
             b = randomInt(15, 45);
          } while(isTrivial('add', [a, b], 1));
          return { text: `${a} + ${b}`, answer: a + b };
        }
      },
      // ... More variants would go here for full spec
       {
        index: 2, description: "Carry in Ones (Guaranteed)", dp: 5, targetTimeMs: 4000,
        generate: () => {
          let a, b;
          do {
            a = randomInt(15, 85);
            b = randomInt(15, 85);
          } while(isTrivial('add', [a, b], 1));
          return { text: `${a} + ${b}`, answer: a + b };
        }
      },
       {
        index: 3, description: "Multi-carry potential", dp: 6, targetTimeMs: 4500,
        generate: () => {
           let a, b;
           do {
            a = randomInt(35, 95);
            b = randomInt(35, 95);
           } while(isTrivial('add', [a, b], 1));
           return { text: `${a} + ${b}`, answer: a + b };
        }
      },
       {
        index: 4, description: "High 2D values", dp: 7, targetTimeMs: 4000,
        generate: () => {
           let a, b;
           do {
             a = randomInt(60, 99);
             b = randomInt(60, 99);
           } while(isTrivial('add', [a, b], 1));
           return { text: `${a} + ${b}`, answer: a + b };
        }
      },
    ]
  }
};

// SUBTRACTION FAMILIES
export const SUB_FAMILIES: Record<string, TemplateFamily> = {
  SUB_1D_1D: {
    id: 'SUB_1D_1D',
    name: '1-Digit Subtraction',
    variants: [
       { index: 0, description: "Simple diff", dp: 1, targetTimeMs: 1500, generate: () => {
          const b = randomInt(2, 5); const a = b + randomInt(1, 4);
          return { text: `${a} - ${b}`, answer: a - b };
       }}, 
       { index: 1, description: "Diff from 10", dp: 2, targetTimeMs: 1800, generate: () => {
          const b = randomInt(2, 8);
          return { text: `10 - ${b}`, answer: 10 - b };
       }},
       { index: 2, description: "Teen - Single (No Borrow)", dp: 2, targetTimeMs: 2000, generate: () => {
          const a = randomInt(11, 19); const b = randomInt(1, a - 10);
          return { text: `${a} - ${b}`, answer: a - b };
       }},
       { index: 3, description: "Teen - Single (Borrow)", dp: 3, targetTimeMs: 2500, generate: () => {
          const a = randomInt(11, 16); const b = randomInt(a - 9, 9);
          return { text: `${a} - ${b}`, answer: a - b };
       }},
       { index: 4, description: "Speed Sub", dp: 3, targetTimeMs: 1500, generate: () => {
          const a = randomInt(7, 15); const b = randomInt(2, a - 2);
          return { text: `${a} - ${b}`, answer: a - b };
       }},
    ]
  }
};
