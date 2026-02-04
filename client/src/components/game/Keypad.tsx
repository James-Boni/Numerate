import React from 'react';
import { motion } from 'framer-motion';
import { Delete, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface KeypadProps {
  onPress: (val: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitDisabled?: boolean;
}

export function Keypad({ onPress, onDelete, onSubmit, disabled, submitDisabled }: KeypadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className="grid grid-cols-3 gap-3 px-6 pb-8 safe-bottom select-none">
      {keys.map((key) => (
        <Button key={key} onClick={() => onPress(key)} disabled={disabled}>
          {key}
        </Button>
      ))}
      
      <Button onClick={onDelete} variant="secondary" disabled={disabled}>
        <Delete className="w-6 h-6" />
      </Button>

      {/* Submit spans full width if we wanted, but let's keep grid or move it aside */}
    </div>
  );
}

// Special layout where submit is separate or integrated?
// Design: Usually 1-9 grid, 0 at bottom center. Backspace left of 0. Submit right of 0?
// Let's re-arrange:
// 1 2 3
// 4 5 6
// 7 8 9
// . 0 <
// Submit button usually large separate button or integrated.
// User spec: "Submit on Enter/Done + explicit Submit button"
// Let's make a big Submit button below the keypad or floated.

export function KeypadModern({ onPress, onDelete, onSubmit, disabled, submitDisabled }: KeypadProps) {
  const keys = [
    '1', '2', '3', '⌫',
    '4', '5', '6', '±',
    '7', '8', '9', '.',
    '', '0', '', ''
  ];

  const filteredKeys = keys.filter(k => k !== '');
  const gridCols = 'grid-cols-4';

  return (
    <div className="w-full bg-secondary/30 pb-safe pt-2">
      <div className={clsx("grid gap-[1px] bg-zinc-200/50", gridCols)}>
        {filteredKeys.map((k, idx) => {
          const isAction = k === '⌫' || k === '±' || k === '.';
          const isZero = k === '0';
          return (
            <motion.button
              key={`${k}-${idx}`}
              whileTap={{ backgroundColor: "rgba(0,0,0,0.1)" }}
              onClick={() => k === '⌫' ? onDelete() : onPress(k)}
              disabled={disabled}
              className={clsx(
                "h-16 text-2xl font-medium flex items-center justify-center bg-white active:bg-zinc-100 transition-colors focus:outline-none touch-manipulation",
                isAction && "bg-zinc-50 text-slate-600",
                isZero && "col-span-2"
              )}
            >
              {k === '⌫' ? <Delete strokeWidth={1.5} /> : k}
            </motion.button>
          );
        })}
      </div>
      <div className="p-4 bg-white">
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onSubmit}
            disabled={disabled || submitDisabled}
            className={clsx(
              "w-full h-14 rounded-xl flex items-center justify-center text-lg font-semibold tracking-wide shadow-sm transition-all",
              "bg-primary text-primary-foreground",
              (disabled || submitDisabled) && "opacity-50 grayscale"
            )}
        >
          Submit Answer
        </motion.button>
      </div>
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', disabled }: any) {
  // Classic button implementation if needed
  return <button>{children}</button>;
}
