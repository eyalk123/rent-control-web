import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '@/core/auth/firebase';
import { loginSchema } from './authFormSchema';
import { FormInput } from '@/shared/components/form/FormInput';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

type FormData = z.infer<typeof loginSchema>;

function firebaseErrorMessage(err: unknown, t: (k: string) => string): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') return t('auth.errorUserNotFound');
  if (code === 'auth/wrong-password') return t('auth.errorWrongPassword');
  if (code === 'auth/email-already-in-use') return t('auth.errorEmailInUse');
  if (code === 'auth/weak-password') return t('auth.errorWeakPassword');
  if (code === 'auth/invalid-email') return t('auth.errorInvalidEmail');
  if (code === 'auth/too-many-requests') return t('auth.errorTooManyRequests');
  return (err as Error)?.message ?? t('auth.errorGeneric');
}

export function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setResetSent(true);
        setLoading(false);
        return;
      }
      navigate('/home', { replace: true });
    } catch (err) {
      setError(firebaseErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  });

  const signInWithGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate('/home', { replace: true });
    } catch (err) {
      setError(firebaseErrorMessage(err, t));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]">
            <Building2 size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">rent-control</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {mode === 'login' ? t('auth.signInTitle') : mode === 'register' ? t('auth.registerTitle') : t('auth.forgotPasswordTitle')}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-6 shadow-sm">
          {resetSent ? (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--color-success)] font-medium">{t('auth.resetEmailSent')}</p>
              <button onClick={() => { setMode('login'); setResetSent(false); }} className="mt-3 text-sm text-[var(--color-primary)] font-medium hover:underline">
                {t('auth.backToSignIn')}
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <FormInput
                label={t('auth.emailLabel')}
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                error={errors.email?.message}
                {...register('email')}
              />
              {mode !== 'forgot' && (
                <FormInput
                  label={t('auth.passwordLabel')}
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  error={errors.password?.message}
                  {...register('password')}
                />
              )}

              {error && (
                <p className="text-xs text-[var(--color-error)] text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? '...' : mode === 'login' ? t('auth.signInButton') : mode === 'register' ? t('auth.registerButton') : t('auth.sendResetButton')}
              </button>

              {mode === 'login' && (
                <>
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--color-outline)]" />
                    <span className="text-xs text-[var(--color-text-secondary)]">{t('common.or') ?? 'or'}</span>
                    <div className="flex-1 h-px bg-[var(--color-outline)]" />
                  </div>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={googleLoading}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface)] py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-input-bg)] disabled:opacity-60"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {googleLoading ? '...' : t('auth.signInWithGoogle')}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Footer links */}
          {!resetSent && (
            <div className="mt-4 flex flex-col items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              {mode === 'login' && (
                <>
                  <button onClick={() => setMode('forgot')} className="hover:text-[var(--color-primary)] hover:underline">
                    {t('auth.forgotPassword')}
                  </button>
                  <span>
                    {t('auth.noAccount')}{' '}
                    <button onClick={() => setMode('register')} className="text-[var(--color-primary)] font-medium hover:underline">
                      {t('auth.registerLink')}
                    </button>
                  </span>
                </>
              )}
              {(mode === 'register' || mode === 'forgot') && (
                <button onClick={() => setMode('login')} className="hover:text-[var(--color-primary)] hover:underline">
                  {t('auth.backToSignIn')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
