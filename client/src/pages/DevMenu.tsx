import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useLocation } from 'wouter';
import { ArrowLeft, Navigation, Database, Trash2, AlertTriangle, X, CheckCircle, BarChart3, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDifficultyProfile } from '@/lib/logic/difficulty-profile';
import { generateQuestionForLevel } from '@/lib/logic/generator_adapter';
import { useAccountStore, isPremiumActive, EntitlementStatus } from '@/lib/services';

const SHOW_DEV_MENU = import.meta.env.MODE !== 'production';

export default function DevMenu() {
  const [, navigate] = useLocation();
  const {
    hasCompletedAssessment,
    startingLevel,
    level,
    sessions,
    quickFireHighScore,
    lifetimeQuestionsAnswered,
    resetProgress,
    devSetLevel,
    devSetStartingLevel,
    devSetHasCompletedAssessment,
    devClearDailySessions,
    devClearQuickFireStats,
    devSetLifetimeQuestions
  } = useStore();

  const [levelInput, setLevelInput] = useState(level.toString());
  const [startingLevelInput, setStartingLevelInput] = useState(startingLevel.toString());
  const [questionsInput, setQuestionsInput] = useState(lifetimeQuestionsAnswered.toString());
  const [levelError, setLevelError] = useState('');
  const [startingLevelError, setStartingLevelError] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const { 
    entitlement, 
    initAppSession, 
    devSetPremium, 
    devSetEntitlementStatus, 
    devSetExpiry 
  } = useAccountStore();

  useEffect(() => {
    initAppSession();
  }, [initAppSession]);

  const isPremium = isPremiumActive(entitlement);

  if (!SHOW_DEV_MENU) {
    return null;
  }

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const handleApplyLevel = () => {
    const val = parseInt(levelInput, 10);
    if (isNaN(val) || val < 1 || val > 200) {
      setLevelError('Level must be 1-200');
      return;
    }
    setLevelError('');
    devSetLevel(val);
    showToast(`Level set to ${val}`);
  };

  const handleApplyStartingLevel = () => {
    const val = parseInt(startingLevelInput, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      setStartingLevelError('Starting level must be 1-100');
      return;
    }
    setStartingLevelError('');
    devSetStartingLevel(val);
    showToast(`Starting level set to ${val}`);
  };

  const handleToggleAssessment = (checked: boolean) => {
    if (!checked) {
      setConfirmAction('toggle_assessment_off');
    } else {
      devSetHasCompletedAssessment(true);
      showToast('Assessment marked as completed');
    }
  };

  const executeConfirmedAction = () => {
    switch (confirmAction) {
      case 'toggle_assessment_off':
        devSetHasCompletedAssessment(false);
        showToast('Assessment marked as incomplete');
        break;
      case 'clear_daily':
        devClearDailySessions();
        showToast('Daily sessions cleared');
        break;
      case 'clear_quickfire':
        devClearQuickFireStats();
        showToast('Quick Fire stats cleared');
        break;
      case 'reset_all':
        const result = resetProgress();
        if (result.success) {
          showToast(`Progress reset to Level ${result.level}`);
        } else {
          showToast(result.error || 'Reset failed');
        }
        break;
    }
    setConfirmAction(null);
  };

  const dailySessionCount = sessions.filter(s => s.sessionType === 'daily').length;
  const quickFireSessionCount = sessions.filter(s => s.sessionType === 'quick_fire').length;

  return (
    <MobileLayout className="bg-slate-900">
      <div className="flex-1 flex flex-col p-4 pb-8 space-y-6 overflow-y-auto no-scrollbar">
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Dev Menu</h1>
            <p className="text-slate-400 text-xs">Development testing tools</p>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Navigation size={16} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Quick Navigation</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/train')} className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Train
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/game')} className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Daily Session
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/quickfire')} className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Quick Fire
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/progress')} className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Progress
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/assessment')} className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Assessment
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Welcome
            </Button>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-4 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Database size={16} />
            <h3 className="text-sm font-bold uppercase tracking-wider">State Controls</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">hasCompletedAssessment</span>
              <Switch
                checked={hasCompletedAssessment}
                onCheckedChange={handleToggleAssessment}
              />
            </div>
            <p className="text-slate-500 text-xs">Gates access to Daily/Quick Fire modes</p>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-2">
            <label className="text-slate-300 text-sm block">Starting Level (initialAssessmentLevel)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={startingLevelInput}
                onChange={(e) => setStartingLevelInput(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white flex-1"
                min={1}
                max={100}
              />
              <Button size="sm" onClick={handleApplyStartingLevel} className="bg-cyan-600 hover:bg-cyan-700">
                Apply
              </Button>
            </div>
            {startingLevelError && <p className="text-rose-400 text-xs">{startingLevelError}</p>}
            <p className="text-slate-500 text-xs">Current: {startingLevel}</p>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-2">
            <label className="text-slate-300 text-sm block">Current Level (user.level)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white flex-1"
                min={1}
                max={200}
              />
              <Button size="sm" onClick={handleApplyLevel} className="bg-cyan-600 hover:bg-cyan-700">
                Apply
              </Button>
            </div>
            {levelError && <p className="text-rose-400 text-xs">{levelError}</p>}
            <p className="text-slate-500 text-xs">Current: {level}</p>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-2">
            <label className="text-slate-300 text-sm block">Lifetime Questions Answered</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={questionsInput}
                onChange={(e) => setQuestionsInput(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white flex-1"
                min={0}
              />
              <Button size="sm" onClick={() => {
                const val = parseInt(questionsInput, 10);
                if (!isNaN(val) && val >= 0) {
                  devSetLifetimeQuestions(val);
                  showToast(`Questions set to ${val}`);
                }
              }} className="bg-cyan-600 hover:bg-cyan-700">
                Apply
              </Button>
            </div>
            <p className="text-slate-500 text-xs">Current: {lifetimeQuestionsAnswered.toLocaleString()}</p>
            <div className="flex gap-2 flex-wrap">
              {[990, 1990, 4990, 9990].map(val => (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-xs"
                  onClick={() => {
                    devSetLifetimeQuestions(val);
                    setQuestionsInput(val.toString());
                    showToast(`Questions set to ${val} (${val + 10}+ triggers milestone)`);
                  }}
                >
                  {val}
                </Button>
              ))}
            </div>
            <p className="text-slate-500 text-xs">Quick-set to just below milestones. Complete a session to trigger celebration.</p>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-4 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Crown size={16} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Entitlement Controls</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">Premium Mode</span>
              <Switch
                checked={isPremium}
                onCheckedChange={async (checked) => {
                  await devSetPremium(checked);
                  showToast(checked ? 'Premium enabled' : 'Premium disabled');
                }}
                data-testid="switch-premium-mode"
              />
            </div>
            <p className="text-slate-500 text-xs">
              Current: {entitlement.tier} ({entitlement.status})
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-2">
            <label className="text-slate-300 text-sm block">Entitlement Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(['inactive', 'active', 'grace', 'expired'] as const).map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  className={`bg-slate-700 border-slate-600 text-white hover:bg-slate-600 ${
                    entitlement.status === status ? 'ring-2 ring-amber-400' : ''
                  }`}
                  onClick={async () => {
                    await devSetEntitlementStatus(status);
                    showToast(`Status set to ${status}`);
                  }}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-2">
            <label className="text-slate-300 text-sm block">Expiry Simulation</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                onClick={async () => {
                  await devSetExpiry(-1);
                  showToast('Set as expired (1 hour ago)');
                }}
              >
                Expired
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                onClick={async () => {
                  await devSetExpiry(24);
                  showToast('Expires in 24 hours');
                }}
              >
                24h remaining
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                onClick={async () => {
                  await devSetExpiry(720);
                  showToast('Expires in 30 days');
                }}
              >
                30d remaining
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                onClick={async () => {
                  await devSetExpiry(null);
                  showToast('No expiry set');
                }}
              >
                No expiry
              </Button>
            </div>
            {entitlement.expiresAt && (
              <p className="text-slate-500 text-xs">
                Expires: {new Date(entitlement.expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-4 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <BarChart3 size={16} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Difficulty Audit</h3>
          </div>
          
          <Button
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-white hover:bg-emerald-700"
            onClick={() => {
              console.log('=== DIFFICULTY AUDIT STARTING ===');
              const levels = [1, 5, 10, 15, 20, 30, 50, 70, 85, 100];
              const samplesPerLevel = 50;
              
              for (const lvl of levels) {
                const profile = getDifficultyProfile(lvl);
                const stats = {
                  opCounts: { add: 0, sub: 0, mul: 0, div: 0, percent: 0, multi: 0 },
                  complexityScores: [] as number[],
                  operandDigits: { a: [] as number[], b: [] as number[] }
                };
                
                for (let i = 0; i < samplesPerLevel; i++) {
                  const q = generateQuestionForLevel(lvl, []);
                  const meta = q.meta;
                  stats.opCounts[meta.operation as keyof typeof stats.opCounts]++;
                  stats.complexityScores.push(meta.complexityScore);
                  
                  const dA = Math.max(1, Math.floor(Math.log10(Math.abs(meta.operandA) || 1)) + 1);
                  const dB = Math.max(1, Math.floor(Math.log10(Math.abs(meta.operandB) || 1)) + 1);
                  stats.operandDigits.a.push(dA);
                  stats.operandDigits.b.push(dB);
                }
                
                const meanComplexity = stats.complexityScores.reduce((a, b) => a + b, 0) / stats.complexityScores.length;
                const meanDigitsA = stats.operandDigits.a.reduce((a, b) => a + b, 0) / stats.operandDigits.a.length;
                const meanDigitsB = stats.operandDigits.b.reduce((a, b) => a + b, 0) / stats.operandDigits.b.length;
                
                console.log(`\n--- LEVEL ${lvl} ---`);
                console.log(`Profile: ${profile.description}`);
                console.log(`Op Distribution: Add=${((stats.opCounts.add/samplesPerLevel)*100).toFixed(0)}% Sub=${((stats.opCounts.sub/samplesPerLevel)*100).toFixed(0)}% Mul=${((stats.opCounts.mul/samplesPerLevel)*100).toFixed(0)}% Div=${((stats.opCounts.div/samplesPerLevel)*100).toFixed(0)}%`);
                console.log(`Mean Complexity: ${meanComplexity.toFixed(1)} (min required: ${profile.minComplexityScore})`);
                console.log(`Mean Operand Digits: A=${meanDigitsA.toFixed(1)} B=${meanDigitsB.toFixed(1)}`);
              }
              
              console.log('\n=== AUDIT COMPLETE ===');
              showToast('Difficulty audit logged to console');
            }}
          >
            Run Difficulty Audit (Console)
          </Button>
          
          <p className="text-slate-500 text-xs">Generates 50 questions per level and logs analysis to browser console.</p>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-4 space-y-4">
          <div className="flex items-center gap-2 text-rose-400 mb-2">
            <Trash2 size={16} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Destructive Actions</h3>
          </div>

          <Button
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600 justify-between"
            onClick={() => setConfirmAction('clear_daily')}
          >
            <span>Clear Daily History</span>
            <span className="text-slate-400 text-xs">{dailySessionCount} sessions</span>
          </Button>

          <Button
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600 justify-between"
            onClick={() => setConfirmAction('clear_quickfire')}
          >
            <span>Clear Quick Fire Stats</span>
            <span className="text-slate-400 text-xs">PB: {quickFireHighScore} | {quickFireSessionCount} sessions</span>
          </Button>

          <Button
            variant="destructive"
            className="w-full bg-rose-600 hover:bg-rose-700"
            onClick={() => setConfirmAction('reset_all')}
            disabled={!hasCompletedAssessment}
          >
            Reset All Progress
          </Button>
          {!hasCompletedAssessment && (
            <p className="text-amber-400 text-xs text-center">Complete assessment first to enable reset</p>
          )}
        </Card>

        <div className="text-center pt-4">
          <p className="text-slate-500 text-xs">DEV BUILD ONLY - Not visible in production</p>
        </div>
      </div>

      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-900/50 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-rose-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Confirm Action</h2>
              </div>

              <p className="text-slate-300 text-sm mb-6">
                {confirmAction === 'toggle_assessment_off' && 'Turning off assessment will hide Daily and Quick Fire modes. Are you sure?'}
                {confirmAction === 'clear_daily' && `This will delete ${dailySessionCount} daily session records. Progress charts will be empty.`}
                {confirmAction === 'clear_quickfire' && `This will clear Quick Fire high score (${quickFireHighScore}) and ${quickFireSessionCount} session records.`}
                {confirmAction === 'reset_all' && `This will reset all progress and return you to Level ${startingLevel}.`}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-rose-600 hover:bg-rose-700"
                  onClick={executeConfirmedAction}
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-4 right-4 z-50"
          >
            <div className="bg-emerald-800 text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-300" />
              <span className="text-sm flex-1">{toast.message}</span>
              <button
                onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                className="p-1 hover:bg-emerald-700 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileLayout>
  );
}
