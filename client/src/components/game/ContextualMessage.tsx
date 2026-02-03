import React from 'react';
import { motion } from 'framer-motion';

interface ContextualMessageProps {
  accuracy: number;
  avgSpeed: number;
  bestStreak: number;
  totalQuestions: number;
  isPersonalBest?: boolean;
}

function getContextualMessage(props: ContextualMessageProps): { message: string; emoji?: string } {
  const { accuracy, avgSpeed, bestStreak, totalQuestions, isPersonalBest } = props;
  
  if (isPersonalBest) {
    return { message: "New personal best! You're getting stronger!", emoji: "🏆" };
  }
  
  if (accuracy >= 0.95 && avgSpeed < 2000) {
    return { message: "Outstanding! Fast and accurate - you're on fire!", emoji: "🔥" };
  }
  
  if (accuracy >= 0.95) {
    return { message: "Excellent accuracy! Your precision is remarkable.", emoji: "🎯" };
  }
  
  if (accuracy >= 0.85 && bestStreak >= 10) {
    return { message: `Amazing ${bestStreak}-streak! You found your flow.`, emoji: "⚡" };
  }
  
  if (accuracy >= 0.85) {
    return { message: "Great session! Keep building that fluency.", emoji: "💪" };
  }
  
  if (avgSpeed < 1500 && accuracy >= 0.7) {
    return { message: "Lightning fast responses! Speed is improving.", emoji: "⚡" };
  }
  
  if (totalQuestions >= 60) {
    return { message: "High volume session! Practice makes progress.", emoji: "📈" };
  }
  
  if (accuracy >= 0.7) {
    return { message: "Good work! Every session builds your skills.", emoji: "✨" };
  }
  
  if (accuracy >= 0.5) {
    return { message: "Keep practicing! You're making progress.", emoji: "🌱" };
  }
  
  return { message: "Challenge accepted. Growth comes from persistence.", emoji: "💫" };
}

export function ContextualMessage(props: ContextualMessageProps) {
  const { message, emoji } = getContextualMessage(props);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="text-center"
    >
      <p className="text-slate-500 text-sm">
        {emoji && <span className="mr-1">{emoji}</span>}
        {message}
      </p>
    </motion.div>
  );
}
