import React from 'react';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { TrendingUp, Brain, Shield, Sparkles } from 'lucide-react';

interface ReassuranceScreenProps {
  onContinue: () => void;
}

export function ReassuranceScreen({ onContinue }: ReassuranceScreenProps) {
  return (
    <MobileLayout className="bg-gradient-to-b from-teal-50 to-white">
      <div className="flex-1 flex flex-col p-8 safe-top safe-bottom">
        <div className="flex-1 flex flex-col justify-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 text-teal-600 rounded-full mx-auto"
            >
              <Sparkles size={40} />
            </motion.div>
            
            <h1 className="text-3xl font-bold text-slate-900">
              Great First Session!
            </h1>
            
            <p className="text-lg text-slate-600 leading-relaxed max-w-sm mx-auto">
              You've taken the first step toward building your mental math confidence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
              <div className="p-2 bg-teal-100 rounded-xl">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Questions adapt to you</h3>
                <p className="text-sm text-slate-500 mt-1">
                  As you improve, questions gradually get more challenging. You'll always be working at your growing edge.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Brain className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Mistakes help you learn</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Every wrong answer is a chance to build stronger neural pathways. There's no judgment here.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
              <div className="p-2 bg-violet-100 rounded-xl">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Progress, not perfection</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Focus on showing up daily. Small, consistent practice builds lasting fluency over time.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-6"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/20"
            onClick={onContinue}
            data-testid="button-continue-reassurance"
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
