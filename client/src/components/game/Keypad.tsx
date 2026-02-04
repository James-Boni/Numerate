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
  return (
    <div className="w-full bg-white pb-safe">
      <div className="grid grid-cols-4 gap-[1px] bg-zinc-200">
        {/* Row 1 */}
        <KeyButton onClick={() => onPress('1')} disabled={disabled}>1</KeyButton>
        <KeyButton onClick={() => onPress('2')} disabled={disabled}>2</KeyButton>
        <KeyButton onClick={() => onPress('3')} disabled={disabled}>3</KeyButton>
        <KeyButton onClick={onDelete} disabled={disabled} variant="action">
          <Delete strokeWidth={1.5} className="w-7 h-7" />
        </KeyButton>
        
        {/* Row 2 */}
        <KeyButton onClick={() => onPress('4')} disabled={disabled}>4</KeyButton>
        <KeyButton onClick={() => onPress('5')} disabled={disabled}>5</KeyButton>
        <KeyButton onClick={() => onPress('6')} disabled={disabled}>6</KeyButton>
        <KeyButton onClick={() => onPress('±')} disabled={disabled} variant="action">±</KeyButton>
        
        {/* Row 3 */}
        <KeyButton onClick={() => onPress('7')} disabled={disabled}>7</KeyButton>
        <KeyButton onClick={() => onPress('8')} disabled={disabled}>8</KeyButton>
        <KeyButton onClick={() => onPress('9')} disabled={disabled}>9</KeyButton>
        <KeyButton onClick={() => onPress('.')} disabled={disabled} variant="action">.</KeyButton>
        
        {/* Row 4 - 0 spans 2 columns */}
        <KeyButton onClick={() => onPress('0')} disabled={disabled} className="col-span-2">0</KeyButton>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSubmit}
          disabled={disabled || submitDisabled}
          className={clsx(
            "col-span-2 h-[72px] text-xl font-bold flex items-center justify-center bg-primary text-primary-foreground active:bg-primary/90 transition-colors focus:outline-none touch-manipulation",
            (disabled || submitDisabled) && "opacity-50"
          )}
        >
          Submit
        </motion.button>
      </div>
    </div>
  );
}

interface KeyButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'number' | 'action';
  className?: string;
}

function KeyButton({ children, onClick, disabled, variant = 'number', className }: KeyButtonProps) {
  return (
    <motion.button
      whileTap={{ backgroundColor: "rgba(0,0,0,0.08)" }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "h-[72px] text-3xl font-medium flex items-center justify-center bg-white active:bg-zinc-100 transition-colors focus:outline-none touch-manipulation select-none",
        variant === 'action' && "bg-zinc-50 text-slate-600 text-2xl",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

function Button({ children, onClick, variant = 'primary', disabled }: any) {
  // Classic button implementation if needed
  return <button>{children}</button>;
}
