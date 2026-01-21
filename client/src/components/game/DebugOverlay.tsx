import React from 'react';
import { useStore } from '@/lib/store';

export const DebugOverlay = () => {
  const { progression, settings, toggleDebugOverlay } = useStore();
  
  if (!settings.showDebugOverlay) {
    return (
      <div className="fixed bottom-1 right-1 z-50 opacity-20 hover:opacity-100">
        <button 
          onClick={toggleDebugOverlay}
          className="text-[10px] bg-black text-white px-1"
        >
          DBG
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 w-64 h-full bg-black/80 text-green-400 font-mono text-xs z-50 p-2 overflow-y-auto pointer-events-none">
      <div className="pointer-events-auto mb-4 flex justify-between">
        <h3 className="font-bold text-white">Progression Debug</h3>
        <button onClick={toggleDebugOverlay} className="text-white border px-1">X</button>
      </div>
      
      <div className="space-y-2 mb-4">
        <div>Level: <span className="text-white">{progression.level}</span></div>
        <div>Band: <span className="text-white">{progression.band}</span></div>
        <div>SR Global: <span className="text-white">{progression.srGlobal.toFixed(2)}</span></div>
        <div>Diff Step: <span className="text-white">{progression.difficultyStep}</span></div>
        <div>Streaks: G:{progression.goodStreak} / P:{progression.poorStreak}</div>
      </div>

      <div className="border-t border-green-800 pt-2">
        <h4 className="text-white mb-2">History (Last 10)</h4>
        {progression.history.slice(0, 10).map((h, i) => (
          <div key={i} className="mb-1 border-b border-green-900 pb-1">
            <div className="flex justify-between">
              <span>{h.templateId || 'UNK'}</span>
              <span className={h.correct ? 'text-green-400' : 'text-red-400'}>
                {h.correct ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{h.timeMs}ms</span>
              <span>PS: {h.ps?.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
