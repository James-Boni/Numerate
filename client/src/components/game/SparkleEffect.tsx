import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SparkleProps {
  x: number;
  y: number;
  delay: number;
  size: number;
  color: string;
}

function Sparkle({ x, y, delay, size, color }: SparkleProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: x, 
        top: y,
        width: size,
        height: size,
      }}
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{ 
        scale: [0, 1, 0],
        opacity: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: "easeOut"
      }}
    >
      <svg viewBox="0 0 24 24" fill={color}>
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
      </svg>
    </motion.div>
  );
}

interface SparkleEffectProps {
  active: boolean;
  color?: string;
  count?: number;
  className?: string;
}

export function SparkleEffect({ 
  active, 
  color = '#14B8A6', 
  count = 6,
  className = ''
}: SparkleEffectProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([]);

  useEffect(() => {
    if (active) {
      const newSparkles = Array.from({ length: count }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        delay: i * 0.1,
        size: 8 + Math.random() * 8,
      }));
      setSparkles(newSparkles);
      
      const timer = setTimeout(() => setSparkles([]), 1000);
      return () => clearTimeout(timer);
    }
  }, [active, count]);

  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      <AnimatePresence>
        {sparkles.map(sparkle => (
          <Sparkle
            key={sparkle.id}
            x={sparkle.x}
            y={sparkle.y}
            delay={sparkle.delay}
            size={sparkle.size}
            color={color}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
