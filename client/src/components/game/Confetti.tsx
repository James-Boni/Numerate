import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#0D9488', '#14B8A6', '#2DD4BF', '#FBBF24', '#F59E0B', '#A78BFA', '#8B5CF6'];

interface ConfettiPieceProps {
  index: number;
  startX: number | string;
  startY: number | string;
}

function ConfettiPiece({ index, startX, startY }: ConfettiPieceProps) {
  const color = COLORS[index % COLORS.length];
  const size = 8 + Math.random() * 8;
  const angle = (index / 30) * 360 + Math.random() * 30;
  const velocity = 200 + Math.random() * 200;
  const rotation = Math.random() * 720 - 360;
  const delay = Math.random() * 0.3;
  
  const endX = Math.cos(angle * Math.PI / 180) * velocity;
  const endY = Math.sin(angle * Math.PI / 180) * velocity + 300;
  
  const shapes = ['square', 'circle', 'rectangle'];
  const shape = shapes[index % shapes.length];
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: startX,
        top: startY,
        width: shape === 'rectangle' ? size * 1.5 : size,
        height: shape === 'rectangle' ? size * 0.6 : size,
        backgroundColor: color,
        borderRadius: shape === 'circle' ? '50%' : shape === 'rectangle' ? 2 : 0,
      }}
      initial={{ 
        x: 0, 
        y: 0, 
        opacity: 1,
        rotate: 0,
        scale: 0,
      }}
      animate={{ 
        x: endX,
        y: endY,
        opacity: [1, 1, 0],
        rotate: rotation,
        scale: [0, 1, 0.8],
      }}
      transition={{ 
        duration: 1.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    />
  );
}

interface ConfettiProps {
  active: boolean;
  originX?: number;
  originY?: number;
  count?: number;
}

export function Confetti({ 
  active, 
  originX = 50, 
  originY = 30,
  count = 40 
}: ConfettiProps) {
  const [pieces, setPieces] = useState<number[]>([]);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (active) {
      setKey(k => k + 1);
      setPieces(Array.from({ length: count }, (_, i) => i));
      
      const timer = setTimeout(() => setPieces([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [active, count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {pieces.map(i => (
          <ConfettiPiece
            key={`${key}-${i}`}
            index={i}
            startX={`${originX}%`}
            startY={`${originY}%`}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
