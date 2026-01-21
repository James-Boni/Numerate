import React, { useState, useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/Welcome";
import Assessment from "@/pages/Assessment";
import Train from "@/pages/Train";
import Game from "@/pages/Game";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import { motion, AnimatePresence } from 'framer-motion';

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 1500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-32 h-32 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/10"
      >
        <span className="text-5xl text-white font-bold">∑</span>
      </motion.div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/assessment" component={Assessment} />
      <Route path="/train" component={Train} />
      <Route path="/game" component={Game} />
      <Route path="/progress" component={Progress} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AnimatePresence>
          {loading ? (
            <SplashScreen key="splash" onFinish={() => setLoading(false)} />
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <Router />
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
