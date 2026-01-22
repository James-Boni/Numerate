import { DifficultyParams } from '@/lib/logic/difficulty';

interface OpCounts {
  add: number;
  sub: number;
  mul: number;
  div: number;
}

interface SessionDiagnosticsOverlayProps {
  level: number;
  sessionType: string;
  difficultyParams: DifficultyParams | null;
  opCounts: OpCounts;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  minOperand: number;
  maxOperand: number;
  avgOperand: number;
}

export function SessionDiagnosticsOverlay({
  level,
  sessionType,
  difficultyParams,
  opCounts,
  totalQuestions,
  correctCount,
  accuracy,
  minOperand,
  maxOperand,
  avgOperand
}: SessionDiagnosticsOverlayProps) {
  const total = opCounts.add + opCounts.sub + opCounts.mul + opCounts.div;
  const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(0) : '0';
  
  return (
    <div className="fixed top-2 left-2 z-50 bg-slate-900/95 text-[10px] text-slate-300 font-mono p-2 rounded-lg max-w-[200px] space-y-1">
      <div className="text-amber-400 font-bold uppercase tracking-wider border-b border-slate-700 pb-1 mb-1">
        DEV DIAGNOSTICS
      </div>
      
      <div className="grid grid-cols-2 gap-x-2">
        <span className="text-slate-500">Level:</span>
        <span className="text-cyan-400 font-bold">{level}</span>
        
        <span className="text-slate-500">Session:</span>
        <span>{sessionType}</span>
      </div>
      
      {difficultyParams && (
        <>
          <div className="border-t border-slate-700 pt-1 mt-1">
            <div className="text-slate-400 font-semibold mb-0.5">Difficulty Params:</div>
            <div className="grid grid-cols-2 gap-x-2">
              <span className="text-slate-500">maxAddSub:</span>
              <span>{difficultyParams.maxAddSub}</span>
              
              <span className="text-slate-500">allowMul:</span>
              <span>{difficultyParams.allowMul ? 'yes' : 'no'}</span>
              
              <span className="text-slate-500">allowDiv:</span>
              <span>{difficultyParams.allowDiv ? 'yes' : 'no'}</span>
            </div>
          </div>
          
          <div className="border-t border-slate-700 pt-1 mt-1">
            <div className="text-slate-400 font-semibold mb-0.5">Op Weights:</div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <div className="text-green-400">+</div>
                <div>{(difficultyParams.opWeights.add * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-red-400">−</div>
                <div>{(difficultyParams.opWeights.sub * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-blue-400">×</div>
                <div>{(difficultyParams.opWeights.mul * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-yellow-400">÷</div>
                <div>{(difficultyParams.opWeights.div * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </>
      )}
      
      <div className="border-t border-slate-700 pt-1 mt-1">
        <div className="text-slate-400 font-semibold mb-0.5">Live Op Distribution:</div>
        <div className="grid grid-cols-4 gap-1 text-center">
          <div>
            <div className="text-green-400">{opCounts.add}</div>
            <div>{pct(opCounts.add)}%</div>
          </div>
          <div>
            <div className="text-red-400">{opCounts.sub}</div>
            <div>{pct(opCounts.sub)}%</div>
          </div>
          <div>
            <div className="text-blue-400">{opCounts.mul}</div>
            <div>{pct(opCounts.mul)}%</div>
          </div>
          <div>
            <div className="text-yellow-400">{opCounts.div}</div>
            <div>{pct(opCounts.div)}%</div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-slate-700 pt-1 mt-1">
        <div className="text-slate-400 font-semibold mb-0.5">Operand Stats:</div>
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-slate-500">min:</span>
          <span>{minOperand === Infinity ? '-' : minOperand}</span>
          
          <span className="text-slate-500">max:</span>
          <span>{maxOperand === 0 ? '-' : maxOperand}</span>
          
          <span className="text-slate-500">avg:</span>
          <span>{avgOperand > 0 ? avgOperand.toFixed(1) : '-'}</span>
        </div>
      </div>
      
      <div className="border-t border-slate-700 pt-1 mt-1">
        <div className="text-slate-400 font-semibold mb-0.5">Session Progress:</div>
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-slate-500">questions:</span>
          <span>{totalQuestions}</span>
          
          <span className="text-slate-500">correct:</span>
          <span>{correctCount}</span>
          
          <span className="text-slate-500">accuracy:</span>
          <span>{(accuracy * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
