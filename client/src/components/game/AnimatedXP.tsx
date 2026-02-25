import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { AudioManager } from '@/lib/audio';
import { HapticsManager } from '@/lib/haptics';

interface AnimatedXPProps {
  value: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  soundEnabled?: boolean;
  className?: string;
}

const GLOW_COLORS = [
  'rgba(13, 148, 136, 0)',      // teal-600 transparent (base)
  'rgba(20, 184, 166, 0.4)',    // teal-500
  'rgba(45, 212, 191, 0.6)',    // teal-400
  'rgba(251, 191, 36, 0.7)',    // amber-400
  'rgba(245, 158, 11, 0.8)',    // amber-500 (big gains)
];

export function AnimatedXP({ 
  value, 
  showLabel = true, 
  size = 'sm',
  soundEnabled = true,
  className = '' 
}: AnimatedXPProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isPopping, setIsPopping] = useState(false);
  const [popIntensity, setPopIntensity] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const prevValueRef = useRef(value);
  const particleIdRef = useRef(0);
  
  const springValue = useSpring(value, { stiffness: 100, damping: 15 });
  
  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue]);
  
  useEffect(() => {
    const diff = value - prevValueRef.current;
    
    if (diff > 0) {
      // Calculate intensity based on XP gain
      // Small gain (10-20): intensity 1
      // Medium gain (20-50): intensity 2
      // Large gain (50-100): intensity 3
      // Huge gain (100+): intensity 4
      let intensity = 1;
      if (diff >= 100) intensity = 4;
      else if (diff >= 50) intensity = 3;
      else if (diff >= 20) intensity = 2;
      
      setPopIntensity(intensity);
      setIsPopping(true);
      
      // Add particles for bigger gains
      if (intensity >= 2) {
        const newParticles = Array.from({ length: intensity * 2 }, () => ({
          id: particleIdRef.current++,
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 40,
        }));
        setParticles(prev => [...prev, ...newParticles]);
      }
      
      // Play sound based on intensity
      if (soundEnabled) {
        if (intensity >= 4) {
          AudioManager.playXPBurst();
          HapticsManager.xpBurst();
        } else if (intensity >= 2) {
          AudioManager.playXPPop(intensity);
        } else {
          AudioManager.playXPTick();
        }
      }
      
      setTimeout(() => {
        setIsPopping(false);
        setPopIntensity(0);
      }, intensity >= 3 ? 400 : 200);
      
      // Clear particles after animation
      setTimeout(() => {
        setParticles([]);
      }, 600);
    }
    
    springValue.set(value);
    prevValueRef.current = value;
  }, [value, springValue, soundEnabled]);
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };
  
  const glowColor = GLOW_COLORS[Math.min(popIntensity, GLOW_COLORS.length - 1)];
  
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Particles */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute w-1.5 h-1.5 rounded-full bg-amber-400"
            initial={{ 
              opacity: 1, 
              scale: 0,
              x: 0, 
              y: 0 
            }}
            animate={{ 
              opacity: 0, 
              scale: 1.5,
              x: particle.x,
              y: particle.y - 20
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ left: '50%', top: '50%' }}
          />
        ))}
      </AnimatePresence>
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          boxShadow: isPopping 
            ? `0 0 ${8 + popIntensity * 4}px ${4 + popIntensity * 2}px ${glowColor}`
            : '0 0 0 0 rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* XP Value */}
      <motion.div
        className={`font-bold ${sizeClasses[size]} flex items-center gap-1`}
        animate={{
          scale: isPopping ? 1 + popIntensity * 0.15 : 1,
          color: isPopping 
            ? popIntensity >= 3 ? '#f59e0b' // amber-500
            : popIntensity >= 2 ? '#14b8a6' // teal-500
            : '#0d9488' // teal-600
            : '#0d9488', // teal-600 base
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 15 
        }}
      >
        {showLabel && <span>XP</span>}
        <motion.span 
          className="tabular-nums"
          key={displayValue}
        >
          {displayValue.toLocaleString()}
        </motion.span>
      </motion.div>
    </div>
  );
}

// Dramatic XP counter for session results - rolls up from 0
interface XPRollupProps {
  targetValue: number;
  duration?: number;
  onComplete?: () => void;
  soundEnabled?: boolean;
}

export function XPRollup({ 
  targetValue, 
  duration = 2000, 
  onComplete,
  soundEnabled = true 
}: XPRollupProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [phase, setPhase] = useState<'counting' | 'burst' | 'complete'>('counting');
  
  useEffect(() => {
    if (targetValue <= 0) {
      setPhase('complete');
      onComplete?.();
      return;
    }
    
    const startTime = Date.now();
    const interval = 30;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const newValue = Math.round(eased * targetValue);
      
      if (newValue !== displayValue) {
        setDisplayValue(newValue);
        
        // Play tick sounds during counting
        if (soundEnabled && newValue % 10 === 0) {
          AudioManager.playXPTick();
        }
      }
      
      if (progress >= 1) {
        clearInterval(timer);
        setPhase('burst');
        
        if (soundEnabled) {
          AudioManager.playXPBurst();
          HapticsManager.xpBurst();
        }
        
        setTimeout(() => {
          setPhase('complete');
          onComplete?.();
        }, 500);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [targetValue, duration, onComplete, soundEnabled]);
  
  return (
    <div className="relative">
      {/* Burst effect */}
      <AnimatePresence>
        {phase === 'burst' && (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-400"
                initial={{ 
                  opacity: 1, 
                  scale: 0,
                  x: 0, 
                  y: 0 
                }}
                animate={{ 
                  opacity: 0, 
                  scale: 2,
                  x: Math.cos((i / 12) * Math.PI * 2) * 80,
                  y: Math.sin((i / 12) * Math.PI * 2) * 80
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ left: '50%', top: '50%' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
      
      {/* Main value */}
      <motion.div
        className="text-5xl font-bold text-primary tabular-nums"
        animate={{
          scale: phase === 'burst' ? [1, 1.3, 1.1] : 1,
          color: phase === 'burst' ? ['#0d9488', '#f59e0b', '#0d9488'] : '#0d9488',
        }}
        transition={{ 
          duration: 0.4,
          times: [0, 0.5, 1]
        }}
      >
        +{displayValue.toLocaleString()} XP
      </motion.div>
    </div>
  );
}
