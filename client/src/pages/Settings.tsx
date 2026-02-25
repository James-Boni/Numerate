import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Volume2, Zap, LogOut, Trash2, ChevronRight, User, AlertTriangle, X, Code, Crown, RotateCcw, Apple, Bell, Clock } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { HapticsManager } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAccountStore, isPremiumActive, authService } from '@/lib/services';

const SHOW_DEV_MENU = import.meta.env.MODE !== 'production';

export default function Settings() {
  const [, navigate] = useLocation();
  const { settings, updateSettings, logout, resetProgress, email, hasCompletedAssessment, startingLevel } = useStore();
  const { entitlement, authState, restorePurchases, linkApple, initAppSession } = useAccountStore();
  const [showResetModal, setShowResetModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    initAppSession();
  }, [initAppSession]);

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      setToast({ message: 'Purchases restored successfully.', visible: true });
    } catch (error) {
      setToast({ message: 'Failed to restore purchases.', visible: true });
    }
    setIsRestoring(false);
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleLinkApple = async () => {
    const success = await linkApple();
    if (success) {
      setToast({ message: 'Apple account linked!', visible: true });
    } else {
      setToast({ message: 'Apple Sign-In coming soon.', visible: true });
    }
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const isPremium = isPremiumActive(entitlement);
  const isAppleLinked = authState.provider === 'apple';
  const isAppleAvailable = authService.isAppleAuthAvailable();

  const handleResetClick = () => {
    if (!hasCompletedAssessment) {
      setToast({ message: 'Reset unavailable until you complete the assessment.', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return;
    }
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    const result = resetProgress();
    setShowResetModal(false);
    
    if (result.success && result.level) {
      setToast({ message: `Progress reset. You're back at Level ${result.level}.`, visible: true });
    } else {
      setToast({ message: result.error || 'Failed to reset progress.', visible: true });
    }
    
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  return (
    <MobileLayout className="bg-slate-50">
      <div className="flex-1 flex flex-col p-6 pb-24 space-y-8 overflow-y-auto no-scrollbar">
        <div className="pt-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-slate-500">Configure your experience.</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Account</h3>
          <Card className="divide-y divide-slate-50 border-none shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAppleLinked ? 'bg-slate-900' : 'bg-indigo-100'}`}>
                  {isAppleLinked ? <Apple size={20} className="text-white" /> : <User size={20} className="text-indigo-600" />}
                </div>
                <div>
                  <p className="font-bold text-sm">{isAppleLinked ? 'Apple Account' : 'Guest User'}</p>
                  <p className="text-xs text-slate-400">{isPremium ? 'Premium' : 'Free Tier'}</p>
                </div>
              </div>
              {!isAppleLinked && (
                <button 
                  onClick={handleLinkApple}
                  className="text-primary text-xs font-bold uppercase tracking-wider"
                  data-testid="button-link-apple"
                >
                  {isAppleAvailable ? 'Link Apple' : 'Coming Soon'}
                </button>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Premium</h3>
          <Card className="divide-y divide-slate-50 border-none shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <Crown size={20} className={isPremium ? 'text-amber-500' : 'text-slate-300'} />
                <div>
                  <span className="font-medium text-sm">{isPremium ? 'Premium Active' : 'Free Plan'}</span>
                  {isPremium && entitlement.expiresAt && (
                    <p className="text-xs text-slate-400">
                      {entitlement.status === 'grace' ? 'Grace period' : 
                       entitlement.status === 'expired' ? 'Expired' :
                       `Renews ${new Date(entitlement.expiresAt).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>
              {!isPremium && (
                <span className="text-xs text-slate-400">Coming soon</span>
              )}
            </div>
            <button 
              onClick={handleRestorePurchases}
              disabled={isRestoring}
              className="w-full p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              data-testid="button-restore-purchases"
            >
              <div className="flex items-center gap-3 text-slate-600">
                <RotateCcw size={20} className={isRestoring ? 'animate-spin' : ''} />
                <span className="font-medium text-sm">Restore Purchases</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Preferences</h3>
          <Card className="divide-y divide-slate-50 border-none shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <Volume2 className="text-slate-400" size={20} />
                <span className="font-medium text-sm">Sound Effects</span>
              </div>
              <Switch 
                checked={settings.soundOn} 
                onCheckedChange={(checked) => updateSettings({ soundOn: checked })} 
              />
            </div>
            <div className="p-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <Zap className="text-slate-400" size={20} />
                <span className="font-medium text-sm">Haptic Feedback</span>
              </div>
              <Switch 
                checked={settings.hapticsOn} 
                onCheckedChange={(checked) => {
                  updateSettings({ hapticsOn: checked });
                  HapticsManager.setEnabled(checked);
                }} 
              />
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Daily Reminders</h3>
          <Card className="divide-y divide-slate-50 border-none shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <Bell className={settings.notificationsEnabled ? "text-primary" : "text-slate-400"} size={20} />
                <div>
                  <span className="font-medium text-sm">Daily Reminder</span>
                  <p className="text-xs text-slate-400">Get a nudge on this device</p>
                </div>
              </div>
              <Switch 
                checked={settings.notificationsEnabled} 
                onCheckedChange={(checked) => {
                  if (checked && 'Notification' in window) {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        updateSettings({ notificationsEnabled: true });
                        setToast({ message: 'Daily reminders enabled!', visible: true });
                        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
                      } else {
                        setToast({ message: 'Please allow notifications in your browser settings.', visible: true });
                        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
                      }
                    });
                  } else {
                    updateSettings({ notificationsEnabled: checked });
                  }
                }}
                data-testid="switch-notifications-enabled"
              />
            </div>
            {settings.notificationsEnabled && (
              <div className="p-4 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <Clock className="text-slate-400" size={20} />
                  <span className="font-medium text-sm">Reminder Time</span>
                </div>
                <input
                  type="time"
                  value={settings.notificationTime}
                  onChange={(e) => updateSettings({ notificationTime: e.target.value })}
                  className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-notification-time"
                />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Sound Diagnostic</h3>
          <Card className="p-4 border-none shadow-sm space-y-4">
            <p className="text-xs text-slate-500">Manual test buttons to verify audio engine.</p>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  console.log("DIAGNOSTIC: Manual Test - Correct");
                  AudioManager.playCorrect();
                }}
              >
                Test Correct Sound
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  console.log("DIAGNOSTIC: Manual Test - Wrong");
                  AudioManager.playWrong();
                }}
              >
                Test Wrong Sound
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  console.log("DIAGNOSTIC: Manual Test - Tap");
                  AudioManager.playTap();
                }}
              >
                Test Tap Sound
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest px-1">Danger Zone</h3>
          <Card className="divide-y divide-slate-50 border-none shadow-sm overflow-hidden border border-rose-100">
            <button 
              onClick={handleResetClick}
              className="w-full p-4 flex items-center justify-between bg-white hover:bg-rose-50 transition-colors"
              data-testid="button-reset-progress"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <Trash2 size={20} />
                <div className="text-left">
                  <span className="font-medium text-sm block">Reset All Progress</span>
                  <span className="text-xs text-rose-400">Clear stats and return to Level {startingLevel || 1}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-rose-300" />
            </button>
            <button 
              onClick={() => { logout(); window.location.href = '/'; }}
              className="w-full p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-600">
                <LogOut size={20} />
                <span className="font-medium text-sm">Sign Out</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </Card>
        </div>

        {SHOW_DEV_MENU && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-1">Developer</h3>
            <Card className="border-none shadow-sm overflow-hidden border border-amber-200">
              <button 
                onClick={() => navigate('/dev')}
                className="w-full p-4 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
                data-testid="button-dev-menu"
              >
                <div className="flex items-center gap-3 text-amber-700">
                  <Code size={20} />
                  <div className="text-left">
                    <span className="font-medium text-sm block">Dev Menu</span>
                    <span className="text-xs text-amber-600">Testing tools (dev only)</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-amber-400" />
              </button>
            </Card>
          </div>
        )}

        <div className="pt-4 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-medium">Numerate v1.0.0</p>
          <div className="flex justify-center gap-4">
            <button className="text-[10px] text-primary font-bold uppercase tracking-widest">Privacy Policy</button>
            <button className="text-[10px] text-primary font-bold uppercase tracking-widest">Support</button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              data-testid="modal-reset-confirm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Reset all progress?</h2>
              </div>
              
              <p className="text-slate-600 text-sm mb-6">
                This will erase your progress and statistics. Your level will return to the one determined by your initial assessment (Level {startingLevel || 1}).
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowResetModal(false)}
                  data-testid="button-reset-cancel"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-rose-500 hover:bg-rose-600"
                  onClick={handleConfirmReset}
                  data-testid="button-reset-confirm"
                >
                  Reset Progress
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
            className="fixed bottom-24 left-4 right-4 z-50"
          >
            <div className="bg-slate-800 text-white rounded-xl px-4 py-3 shadow-lg flex items-center justify-between">
              <span className="text-sm">{toast.message}</span>
              <button 
                onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <BottomNav />
    </MobileLayout>
  );
}
