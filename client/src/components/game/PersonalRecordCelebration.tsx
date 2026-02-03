import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Target, Gauge, Star } from 'lucide-react';

interface PersonalRecordCelebrationProps {
  newRecords: string[];
  onComplete?: () => void;
}

const recordLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  streak: { label: 'Best Answer Streak', icon: Zap, color: '#F59E0B' },
  speed: { label: 'Fastest Response Time', icon: Gauge, color: '#10B981' },
  accuracy: { label: 'Highest Accuracy', icon: Target, color: '#3B82F6' },
  throughput: { label: 'Most Questions Answered', icon: Star, color: '#8B5CF6' },
  fluency: { label: 'Highest Fluency Score', icon: Trophy, color: '#14B8A6' },
};

export function PersonalRecordCelebration({ newRecords, onComplete }: PersonalRecordCelebrationProps) {
  if (newRecords.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <Trophy className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-bold text-amber-800">
            Personal {newRecords.length === 1 ? 'Best' : 'Bests'}!
          </h3>
          <Trophy className="w-6 h-6 text-amber-500" />
        </motion.div>

        <div className="space-y-3">
          {newRecords.map((record, index) => {
            const recordInfo = recordLabels[record];
            if (!recordInfo) return null;
            
            const IconComponent = recordInfo.icon;
            
            return (
              <motion.div
                key={record}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.15 }}
                className="flex items-center gap-3 bg-white/80 rounded-xl px-4 py-3 shadow-sm"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    delay: 0.5 + index * 0.15,
                    duration: 0.6,
                    ease: 'easeInOut'
                  }}
                  className="p-2 rounded-full"
                  style={{ backgroundColor: `${recordInfo.color}20` }}
                >
                  <IconComponent 
                    className="w-5 h-5" 
                    style={{ color: recordInfo.color }} 
                  />
                </motion.div>
                <span className="font-medium text-gray-700">{recordInfo.label}</span>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.15 }}
                  className="ml-auto"
                >
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                    NEW!
                  </span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-amber-700 mt-4"
        >
          You're getting better every day!
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
