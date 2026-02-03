import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Crown, Zap, TrendingUp, Target, X } from 'lucide-react';
import { clsx } from 'clsx';
import { billingService } from '@/lib/services/billing-service';
import { useAccountStore } from '@/lib/services/account-store';
import { IAP_PRODUCTS } from '@/lib/services/types';

interface PaywallScreenProps {
  onSubscribed: () => void;
  onRestore: () => void;
  onDismiss?: () => void;
}

type PlanType = 'monthly' | 'yearly';

export function PaywallScreen({ onSubscribed, onRestore, onDismiss }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const refreshEntitlement = useAccountStore(s => s.refreshEntitlement);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const productId = selectedPlan === 'monthly' 
        ? IAP_PRODUCTS.PREMIUM_MONTHLY 
        : IAP_PRODUCTS.PREMIUM_YEARLY;
      
      await billingService.purchasePremium(productId);
      await refreshEntitlement();
      onSubscribed();
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      await billingService.restorePurchases();
      await refreshEntitlement();
      onRestore();
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap, text: 'Unlimited daily training sessions' },
    { icon: TrendingUp, text: 'Track your progress over time' },
    { icon: Target, text: 'Adaptive difficulty that grows with you' },
  ];

  return (
    <MobileLayout className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 flex flex-col p-6 safe-top safe-bottom text-white" data-testid="screen-paywall">
        {onDismiss && (
          <div className="flex justify-end mb-4">
            <button
              onClick={onDismiss}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              data-testid="button-dismiss-paywall"
            >
              <X size={24} />
            </button>
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mx-auto shadow-lg shadow-amber-500/30"
            >
              <Crown size={40} className="text-white" />
            </motion.div>
            
            <h1 className="text-3xl font-bold">
              Unlock Numerate
            </h1>
            
            <p className="text-slate-400 text-lg max-w-xs mx-auto">
              Continue your journey to mental math mastery
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 bg-white/5 rounded-xl p-4"
              >
                <div className="p-2 bg-teal-500/20 rounded-lg">
                  <feature.icon className="w-5 h-5 text-teal-400" />
                </div>
                <span className="text-slate-200">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={clsx(
                "w-full p-4 rounded-2xl border-2 transition-all relative overflow-hidden",
                selectedPlan === 'yearly'
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-slate-600 bg-slate-800/50"
              )}
              data-testid="button-plan-yearly"
            >
              {selectedPlan === 'yearly' && (
                <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  BEST VALUE
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="font-semibold text-lg">Yearly</div>
                  <div className="text-slate-400 text-sm">Save 17%</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">£10</div>
                  <div className="text-slate-400 text-sm">/year</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedPlan('monthly')}
              className={clsx(
                "w-full p-4 rounded-2xl border-2 transition-all",
                selectedPlan === 'monthly'
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-slate-600 bg-slate-800/50"
              )}
              data-testid="button-plan-monthly"
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="font-semibold text-lg">Monthly</div>
                  <div className="text-slate-400 text-sm">Flexible</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">£1</div>
                  <div className="text-slate-400 text-sm">/month</div>
                </div>
              </div>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-4 pt-4"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/30"
            onClick={handleSubscribe}
            disabled={isLoading}
            data-testid="button-subscribe"
          >
            {isLoading ? 'Processing...' : 'Subscribe Now'}
          </Button>

          <button
            onClick={handleRestore}
            disabled={isLoading}
            className="w-full text-center text-slate-400 text-sm py-2 hover:text-slate-300 transition-colors"
            data-testid="button-restore-purchases"
          >
            Restore Purchases
          </button>

          <p className="text-center text-slate-500 text-xs px-4">
            Payment will be charged through Apple. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.
          </p>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
