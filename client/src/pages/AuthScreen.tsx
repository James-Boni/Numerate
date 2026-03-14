import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/lib/store';
import { signUpWithEmail, signInWithEmail, ensureProfile } from '@/lib/supabase-auth';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [, setLocation] = useLocation();
  const startingLevel = useStore(s => s.startingLevel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { user, error } = await signUpWithEmail(email, password);
        if (error || !user) {
          setErrorMessage(error || 'Sign-up failed');
          setLoading(false);
          return;
        }
        const profileResult = await ensureProfile(user.id, startingLevel);
        if (profileResult.error) {
          console.warn('[AuthScreen] Profile creation warning:', profileResult.error);
        }
        setLocation('/paywall');
      } else {
        const { user, error } = await signInWithEmail(email, password);
        if (error || !user) {
          setErrorMessage(error || 'Sign-in failed');
          setLoading(false);
          return;
        }
        await ensureProfile(user.id, startingLevel);
        setLocation('/paywall');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    setErrorMessage('Sign in with Apple coming soon');
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setErrorMessage('');
  };

  return (
    <MobileLayout className="bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm flex flex-col items-center"
        >
          <h1
            className="text-4xl font-bold text-foreground tracking-tight"
            data-testid="text-app-title"
          >
            Numerate
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Train daily. Track progress.
          </p>

          <div className="mt-8 w-full text-center space-y-1">
            <p
              className="text-lg font-semibold text-foreground"
              data-testid="text-level-placement"
            >
              You've been placed at Level {startingLevel}.
            </p>
            <p className="text-sm text-muted-foreground">
              Create an account to save your progress and continue training.
            </p>
          </div>

          <div className="w-full mt-8 space-y-5">
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-black text-white rounded-xl min-h-[52px] px-6 text-base font-medium active:opacity-80 transition-opacity disabled:opacity-50"
              data-testid="button-apple-signin"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Sign in with Apple
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="h-[52px] rounded-xl text-base px-4"
                data-testid="input-email"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="h-[52px] rounded-xl text-base px-4"
                data-testid="input-password"
              />

              {errorMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive text-center py-1"
                  data-testid="text-error-message"
                >
                  {errorMessage}
                </motion.p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full min-h-[52px] rounded-xl text-base font-medium"
                data-testid="button-auth-submit"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={toggleMode}
                disabled={loading}
                className="text-sm text-muted-foreground active:opacity-60 transition-opacity disabled:opacity-50"
                data-testid="button-toggle-mode"
              >
                {mode === 'signin'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Your progress is saved to your account.
            </p>

            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => setLocation('/paywall')}
                className="w-full min-h-[44px] rounded-xl border-2 border-dashed border-orange-300 text-orange-500 text-sm font-mono font-medium active:opacity-60 transition-opacity"
                data-testid="button-dev-skip-auth"
              >
                Skip Auth (Dev Only)
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
