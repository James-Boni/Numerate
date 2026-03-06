import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useStore } from '@/lib/store';
import { Lock } from 'lucide-react';

export default function PaywallScreen() {
  const [, setLocation] = useLocation();
  const startingLevel = useStore(s => s.startingLevel);

  return (
    <MobileLayout className="bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm flex flex-col items-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1
              className="text-2xl font-bold text-foreground tracking-tight"
              data-testid="text-paywall-title"
            >
              Unlock Numerate
            </h1>
            <p className="text-base text-muted-foreground">
              Your training starts at Level {startingLevel}.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-border bg-muted/30 p-6 space-y-3">
            <p
              className="text-sm text-muted-foreground"
              data-testid="text-paywall-status"
            >
              Pricing and subscription options will appear here once Apple In-App Purchase is connected.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Payment not connected yet.
          </p>

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => setLocation('/game')}
              className="w-full max-w-sm min-h-[44px] rounded-xl border-2 border-dashed border-orange-300 text-orange-500 text-sm font-mono font-medium active:opacity-60 transition-opacity"
              data-testid="button-dev-skip-paywall"
            >
              Skip Paywall (Dev Only)
            </button>
          )}
        </motion.div>
      </div>
    </MobileLayout>
  );
}
