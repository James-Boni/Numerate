import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/lib/store';
import { signUpWithEmail, signInWithEmail, ensureProfile, ensureProfileExists } from '@/lib/supabase-auth';
import { loadProfileFromSupabase } from '@/lib/supabase-sync';

interface FieldErrors {
  confirmEmail?: string;
  confirmPassword?: string;
}

export default function AuthScreen() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialMode = params.get('mode') === 'signin' ? 'signin' : 'signup';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [, setLocation] = useLocation();
  const startingLevel = useStore(s => s.startingLevel);
  const competenceGroup = useStore(s => s.competenceGroup);
  const hasCompletedAssessment = useStore(s => s.hasCompletedAssessment);

  const hasAssessmentContext = mode === 'signup' && hasCompletedAssessment && startingLevel > 0;

  useEffect(() => {
    if (fieldErrors.confirmEmail && email && confirmEmail && email === confirmEmail) {
      setFieldErrors(prev => ({ ...prev, confirmEmail: undefined }));
    }
  }, [email, confirmEmail, fieldErrors.confirmEmail]);

  useEffect(() => {
    if (fieldErrors.confirmPassword && password && confirmPassword && password === confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  }, [password, confirmPassword, fieldErrors.confirmPassword]);

  const validateSignup = (): boolean => {
    const errors: FieldErrors = {};
    if (email !== confirmEmail) {
      errors.confirmEmail = "Email addresses don't match";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (mode === 'signup') {
      if (!hasAssessmentContext) {
        setLocation('/assessment');
        return;
      }
      if (!validateSignup()) return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { user, error } = await signUpWithEmail(email, password);
        if (error || !user) {
          setErrorMessage(error || 'Sign-up failed');
          setLoading(false);
          return;
        }
        const profileResult = await ensureProfile(user.id, startingLevel, competenceGroup);
        if (profileResult.error) {
          console.warn('[AuthScreen] Profile creation warning:', profileResult.error);
        }
        useStore.setState({ uid: user.id, isAuthenticated: true, email: user.email ?? null });
        setLocation('/paywall');
      } else {
        const { user, error } = await signInWithEmail(email, password);
        if (error || !user) {
          setErrorMessage(error || 'Sign-in failed');
          setLoading(false);
          return;
        }
        await ensureProfileExists(user.id);
        const profile = await loadProfileFromSupabase(user.id);
        if (profile) {
          useStore.setState({ ...profile, uid: user.id, isAuthenticated: true, email: user.email ?? null });
        } else {
          useStore.setState({ uid: user.id, isAuthenticated: true, email: user.email ?? null });
        }
        setLocation('/train');
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
    setFieldErrors({});
    setConfirmEmail('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const isSignupWithoutContext = mode === 'signup' && !hasAssessmentContext;

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

          {hasAssessmentContext && (
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
          )}

          {isSignupWithoutContext && (
            <div className="mt-8 w-full text-center space-y-1">
              <p className="text-sm text-muted-foreground" data-testid="text-signup-needs-assessment">
                Creating a new account starts with a short placement assessment.
              </p>
            </div>
          )}

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

            {isSignupWithoutContext ? (
              <Button
                type="button"
                onClick={() => setLocation('/assessment')}
                className="w-full min-h-[52px] rounded-xl text-base font-medium"
                data-testid="button-start-assessment"
              >
                Start Assessment
              </Button>
            ) : (
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

                {mode === 'signup' && (
                  <div className="space-y-1">
                    <Input
                      type="email"
                      placeholder="Confirm Email"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="email"
                      className={`h-[52px] rounded-xl text-base px-4 ${fieldErrors.confirmEmail ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      data-testid="input-confirm-email"
                    />
                    {fieldErrors.confirmEmail && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-destructive pl-1"
                        data-testid="text-error-confirm-email"
                      >
                        {fieldErrors.confirmEmail}
                      </motion.p>
                    )}
                  </div>
                )}

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="h-[52px] rounded-xl text-base px-4 pr-12"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={loading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    data-testid="button-toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-1">
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        className={`h-[52px] rounded-xl text-base px-4 pr-12 ${fieldErrors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        data-testid="input-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        disabled={loading}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        data-testid="button-toggle-confirm-password-visibility"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-destructive pl-1"
                        data-testid="text-error-confirm-password"
                      >
                        {fieldErrors.confirmPassword}
                      </motion.p>
                    )}
                  </div>
                )}

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
            )}

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
