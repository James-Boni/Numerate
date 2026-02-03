import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Lightbulb, ChevronRight, Sparkles } from 'lucide-react';
import { StrategyContent, getStrategyContent } from '@/lib/logic/strategy-content';

interface StrategyLessonProps {
  strategyId: string;
  onComplete: () => void;
}

function AnimatedEquation({ 
  equation, 
  highlight,
  result,
  delay = 0 
}: { 
  equation: string; 
  highlight?: string;
  result?: string;
  delay?: number;
}) {
  const parts = equation.split(/(\d+|[+\-×÷=→])/g).filter(Boolean);
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, type: "spring" }}
      className="flex items-center justify-center gap-1 text-2xl font-mono"
    >
      {parts.map((part, i) => {
        const isNumber = /^\d+$/.test(part);
        const isHighlighted = highlight && part === highlight;
        const isOperator = ['+', '-', '×', '÷', '=', '→'].includes(part);
        
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + i * 0.08, duration: 0.3 }}
            className={`
              ${isNumber ? 'font-bold' : ''}
              ${isHighlighted ? 'text-primary bg-primary/10 px-2 py-1 rounded-lg' : ''}
              ${isOperator ? 'text-slate-400 mx-1' : ''}
              ${!isNumber && !isOperator ? 'text-slate-600' : 'text-slate-800'}
            `}
          >
            {part}
          </motion.span>
        );
      })}
      {result && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.5, type: "spring", stiffness: 300 }}
          className="ml-3 bg-primary text-white px-3 py-1 rounded-full text-lg font-bold"
        >
          {result}
        </motion.span>
      )}
    </motion.div>
  );
}

function StepCard({ 
  step, 
  index, 
  isActive,
  isCompleted 
}: { 
  step: { text: string; equation?: string; highlight?: string; result?: string };
  index: number;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: isActive || isCompleted ? 1 : 0.4, 
        x: 0,
        scale: isActive ? 1.02 : 1
      }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`
        p-4 rounded-2xl border-2 transition-colors duration-300
        ${isActive ? 'border-primary bg-primary/5' : isCompleted ? 'border-green-200 bg-green-50/50' : 'border-slate-100 bg-white'}
      `}
    >
      <div className="flex items-start gap-3">
        <motion.div 
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
            ${isActive ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}
          `}
          animate={isActive ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
        >
          {isCompleted ? '✓' : index + 1}
        </motion.div>
        <div className="flex-1">
          <p className={`text-sm mb-2 ${isActive ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
            {step.text}
          </p>
          {step.equation && isActive && (
            <AnimatedEquation 
              equation={step.equation} 
              highlight={step.highlight}
              result={step.result}
              delay={0.3}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function StrategyLesson({ strategyId, onComplete }: StrategyLessonProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [content, setContent] = useState<StrategyContent | null>(null);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    const strategyContent = getStrategyContent(strategyId);
    if (strategyContent) {
      setContent(strategyContent);
    }
  }, [strategyId]);

  if (!content) {
    return null;
  }

  const isLastStep = currentStep >= content.steps.length - 1;
  const allStepsComplete = currentStep >= content.steps.length;

  const handleNext = () => {
    if (isLastStep) {
      setShowTip(true);
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <MobileLayout className="bg-gradient-to-b from-amber-50 to-white">
      <div className="flex-1 flex flex-col px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Lightbulb size={16} />
            Quick Tip
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{content.title}</h1>
          <p className="text-slate-600">{content.tagline}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-slate-100"
        >
          <p className="text-sm text-slate-500 mb-2">Example Problem</p>
          <p className="text-3xl font-bold text-slate-800 font-mono">{content.example.problem}</p>
        </motion.div>

        <div className="flex-1 space-y-3 overflow-y-auto mb-6">
          {content.steps.map((step, index) => (
            <StepCard
              key={index}
              step={step}
              index={index}
              isActive={index === currentStep}
              isCompleted={index < currentStep}
            />
          ))}

          <AnimatePresence>
            {showTip && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">Remember</p>
                    <p className="text-slate-600 text-sm">{content.tip}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {!allStepsComplete ? (
            <Button
              onClick={handleNext}
              className="w-full h-14 bg-primary text-white hover:opacity-90 font-bold rounded-2xl flex items-center justify-center gap-2"
              data-testid="button-next-step"
            >
              {isLastStep ? 'See Tip' : 'Next Step'}
              <ChevronRight size={20} />
            </Button>
          ) : (
            <Button
              onClick={onComplete}
              className="w-full h-14 bg-primary text-white hover:opacity-90 font-bold rounded-2xl"
              data-testid="button-got-it"
            >
              Got It!
            </Button>
          )}
        </motion.div>

        <button
          onClick={onComplete}
          className="mt-3 text-slate-400 text-sm underline mx-auto"
          data-testid="button-skip-lesson"
        >
          Skip
        </button>
      </div>
    </MobileLayout>
  );
}
