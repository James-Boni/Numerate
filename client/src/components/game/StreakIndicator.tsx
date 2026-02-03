import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';

interface StreakIndicatorProps {
  streak: number;
  className?: string;
}

export function StreakIndicator({ streak, className = '' }: StreakIndicatorProps) {
  const isHotStreak = streak >= 5;
  const isOnFire = streak >= 10;
  
  if (streak < 2) return null;
  
  return (
    <motion.div 
      className={`flex items-center gap-1.5 ${className}`}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      key={streak}
    >
      <motion.div
        animate={isOnFire ? { 
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0]
        } : isHotStreak ? {
          scale: [1, 1.1, 1]
        } : {}}
        transition={{ duration: 0.4, repeat: isOnFire ? Infinity : 0, repeatDelay: 0.5 }}
      >
        {isOnFire ? (
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
        ) : isHotStreak ? (
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
        ) : (
          <Zap className="w-4 h-4 text-teal-500" />
        )}
      </motion.div>
      
      <motion.span 
        className={`font-bold text-sm tabular-nums ${
          isOnFire ? 'text-orange-600' : 
          isHotStreak ? 'text-amber-600' : 
          'text-teal-600'
        }`}
        key={streak}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {streak}
      </motion.span>
    </motion.div>
  );
}
