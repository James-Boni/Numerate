import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { AudioManager } from '@/lib/audio';

export default function Welcome() {
  const [_, setLocation] = useLocation();
  const login = useStore(s => s.login);
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const uid = useStore(s => s.uid);
  const loadFromBackend = useStore(s => s.loadFromBackend);

  useEffect(() => {
    AudioManager.init();
    
    if (isAuthenticated && uid) {
      loadFromBackend();
    }
  }, [isAuthenticated, uid, loadFromBackend]);

  const handleStart = () => {
    if (!isAuthenticated) {
        login("user@example.com"); // Auto-login for MVP
    }
    // Check if assessment needed
    const { hasCompletedAssessment } = useStore.getState();
    if (!hasCompletedAssessment) {
        setLocation('/assessment');
    } else {
        setLocation('/train');
    }
  };

  return (
    <MobileLayout className="bg-white">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-36 h-36"
        >
            <img 
              src="/numerate-logo.png" 
              alt="Numerate Logo" 
              className="w-full h-full object-contain" 
            />
        </motion.div>

        <div className="space-y-4 max-w-[280px]">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Numerate
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed">
                Build arithmetic fluency with daily focused practice.
            </p>
        </div>

        <div className="w-full max-w-xs pt-8">
            <button 
                onClick={handleStart}
                className="w-full h-14 bg-primary text-white rounded-2xl font-semibold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
            >
                Get Started
                <ArrowRight size={20} />
            </button>
            <p className="mt-6 text-xs text-slate-400">
                By continuing, you accept our Terms of Service.
            </p>
        </div>
      </div>
    </MobileLayout>
  );
}
