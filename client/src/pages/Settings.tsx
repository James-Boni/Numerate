import React from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { BottomNav } from '@/components/ui/bottom-nav';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Volume2, Zap, Shield, LogOut, Trash2, ChevronRight, User } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, logout, resetProgress, email } = useStore();

  return (
    <MobileLayout className="bg-slate-50">
      <div className="flex-1 flex flex-col p-6 pb-24 space-y-8 overflow-y-auto no-scrollbar">
        <div className="pt-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-slate-500">Configure your experience.</p>
        </div>

        {/* Account Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Account</h3>
          <Card className="p-4 border-none shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <User size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">{email || 'Guest User'}</p>
                <p className="text-xs text-slate-400">Free Tier</p>
              </div>
            </div>
            <button className="text-primary text-xs font-bold uppercase tracking-wider">Upgrade</button>
          </Card>
        </div>

        {/* Preferences */}
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
                onCheckedChange={(checked) => updateSettings({ hapticsOn: checked })} 
              />
            </div>
          </Card>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Danger Zone</h3>
          <Card className="divide-y divide-slate-50 border-none shadow-sm overflow-hidden">
            <button 
              onClick={resetProgress}
              className="w-full p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <Trash2 size={20} />
                <span className="font-medium text-sm">Reset All Progress</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
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

        <div className="pt-4 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-medium">Maths Trainer v1.0.0</p>
          <div className="flex justify-center gap-4">
            <button className="text-[10px] text-primary font-bold uppercase tracking-widest">Privacy Policy</button>
            <button className="text-[10px] text-primary font-bold uppercase tracking-widest">Support</button>
          </div>
        </div>
      </div>
      <BottomNav />
    </MobileLayout>
  );
}
