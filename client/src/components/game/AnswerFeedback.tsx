import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface AnswerFeedbackProps {
  type: 'correct' | 'wrong' | null;
  streak: number;
  onComplete?: () => void;
}

const CONFETTI_COLORS = ['#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4'];
const STREAK_THRESHOLDS = [3, 5, 10, 15, 20];

function ConfettiParticle({ index, streakLevel }: { index: number; streakLevel: number }) {
  const intensity = Math.min(streakLevel, 4);
  const particleCount = 8 + intensity * 4;
  const angle = (index / particleCount) * 360;
  const distance = 60 + Math.random() * 40 + intensity * 15;
  const size = 4 + Math.random() * 4;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const delay = Math.random() * 0.1;
  
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: '50%',
        top: '50%',
      }}
      initial={{ 
        x: 0, 
        y: 0, 
        scale: 0,
        opacity: 1 
      }}
      animate={{ 
        x: Math.cos(angle * Math.PI / 180) * distance,
        y: Math.sin(angle * Math.PI / 180) * distance,
        scale: [0, 1.2, 0.8],
        opacity: [1, 1, 0],
      }}
      transition={{ 
        duration: 0.6,
        delay,
        ease: "easeOut"
      }}
    />
  );
}

function StreakBurst({ streak }: { streak: number }) {
  const streakLevel = STREAK_THRESHOLDS.filter(t => streak >= t).length;
  if (streakLevel === 0) return null;
  
  const particleCount = 8 + streakLevel * 4;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {Array.from({ length: particleCount }).map((_, i) => (
        <ConfettiParticle key={i} index={i} streakLevel={streakLevel} />
      ))}
    </div>
  );
}

export function AnswerFeedback({ type, streak, onComplete }: AnswerFeedbackProps) {
  const [showStreak, setShowStreak] = useState(false);
  
  useEffect(() => {
    if (type === 'correct' && STREAK_THRESHOLDS.some(t => streak === t)) {
      setShowStreak(true);
      const timer = setTimeout(() => setShowStreak(false), 800);
      return () => clearTimeout(timer);
    }
  }, [type, streak]);
  
  return (
    <AnimatePresence>
      {type && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 25,
              duration: 0.3 
            }}
          >
            {type === 'correct' ? (
              <>
                <motion.div 
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30"
                  animate={{ 
                    boxShadow: [
                      '0 10px 25px -5px rgba(20, 184, 166, 0.3)',
                      '0 15px 35px -5px rgba(20, 184, 166, 0.5)',
                      '0 10px 25px -5px rgba(20, 184, 166, 0.3)',
                    ]
                  }}
                  transition={{ duration: 0.4 }}
                >
                  <Check className="w-10 h-10 text-white" strokeWidth={3} />
                </motion.div>
                
                {streak >= 3 && <StreakBurst streak={streak} />}
              </>
            ) : (
              <motion.div 
                className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
                animate={{ 
                  x: [0, -6, 6, -4, 4, 0],
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <X className="w-10 h-10 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </motion.div>
          
          {showStreak && streak >= 3 && (
            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-lg font-bold text-teal-600 bg-teal-50 px-4 py-1 rounded-full">
                {streak} in a row!
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
