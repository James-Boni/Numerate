import React from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { SessionScreen } from '@/components/game/SessionScreen';
import { useLocation } from 'wouter';
import { useStore } from '@/lib/store';

export default function Game() {
  const [_, setLocation] = useLocation();
  const { currentTier, saveSession } = useStore();

  return (
    <SessionScreen 
      mode="training"
      durationSeconds={180}
      initialTier={currentTier}
      onComplete={(stats) => {
        saveSession(stats);
        setLocation('/train'); // Should go to summary but routing for now
      }}
      onExit={() => setLocation('/train')}
    />
  );
}
