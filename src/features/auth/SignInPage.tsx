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
import { Building2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPropertyColor } from '@/shared/utils/propertyColor';
import type { z } from 'zod';

type FormData = z.infer<typeof loginSchema>;
type Mode = 'login' | 'register' | 'forgot';

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

const TILE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
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

  const handleForgot = async () => {
    const email = getValues('email');
    if (!email) { setError(t('auth.enterEmailFirst')); return; }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError(firebaseErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

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
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-background)' }}>
      {/* Left — brand panel */}
      <div
        className="hidden md:flex flex-col justify-between flex-1 min-w-0 relative overflow-hidden"
        style={{ background: 'var(--color-brand-navy)', padding: '40px 56px', color: '#fff' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <Building2 size={18} style={{ color: 'var(--color-brand-navy)' }} />
          </div>
          <span className="text-base font-bold tracking-tight">Rent Control</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <p className="text-[13px] font-medium uppercase tracking-widest opacity-65 mb-5">
            One ledger. Every property.
          </p>
          <h1 className="text-5xl font-bold leading-[1.06] tracking-tight max-w-[520px]" style={{ letterSpacing: '-1.2px' }}>
            Track rent, expenses & leases without spreadsheets.
          </h1>
          <p className="text-base opacity-80 mt-5 max-w-[460px] leading-relaxed">
            Built for small landlords. Multi-year leases with automatic escalation,
            supplier-linked expenses, and annual reports in one click.
          </p>
        </div>

        {/* Decorative property tiles grid */}
        <div
          className="absolute pointer-events-none"
          style={{ right: -120, top: -80, opacity: 0.16, transform: 'rotate(-8deg)' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 100px)', gap: 14 }}>
            {TILE_IDS.map((id) => (
              <div
                key={id}
                style={{ width: 100, height: 130, borderRadius: 10, background: getPropertyColor(id), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                  <path d="M3 11l9-8 9 8v10H3z" fill="rgba(255,255,255,0.55)" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 text-[12.5px] opacity-60">
          <span>v1.0.0</span><span>·</span>
          <span>iOS · Android · Web</span><span>·</span>
          <span>EN · עברית</span>
        </div>
      </div>

      {/* Right — auth form */}
      <div
        className="flex items-center justify-center shrink-0 w-full md:w-[480px] p-10"
        style={{ background: 'var(--color-surface)', borderLeft: '1px solid var(--color-outline)' }}
      >
        <div className="w-full max-w-[340px]">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--color-brand-navy)' }}>
              <Building2 size={19} className="text-white" />
            </div>
            <span className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Rent Control</span>
          </div>

          {mode === 'forgot' ? (
            /* Forgot password */
            <div>
              <h2 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
                {t('auth.resetPasswordTitle')}
              </h2>
              <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                {t('auth.resetPasswordDesc')}
              </p>
              <FormInput
                label={t('auth.emailLabel')}
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                error={errors.email?.message}
                {...register('email')}
              />
              {error && <p className="mt-2 text-xs text-center" style={{ color: 'var(--color-error)' }}>{error}</p>}
              {resetSent ? (
                <div className="mt-4 flex items-center gap-2 rounded-[9px] px-3.5 py-3 text-sm font-medium" style={{ background: 'var(--color-rev-bg)', color: 'var(--color-rev-fg)' }}>
                  <Check size={15} /> {t('auth.resetLinkSent')}
                </div>
              ) : (
                <button
                  onClick={handleForgot}
                  disabled={loading}
                  className="mt-4 w-full h-11 rounded-[10px] text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {loading ? '…' : t('auth.sendResetLink')}
                </button>
              )}
              <div className="mt-5 text-center">
                <button
                  onClick={() => { setMode('login'); setResetSent(false); setError(''); }}
                  className="text-[12.5px] font-semibold"
                  style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t('auth.backToSignIn')}
                </button>
              </div>
            </div>
          ) : (
            /* Sign-in / Register */
            <div>
              <h2 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
                {mode === 'login' ? t('auth.signInTitle') : t('auth.registerTitle')}
              </h2>
              <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                {mode === 'login' ? t('auth.signInDesc') : t('auth.createAccountDesc')}
              </p>

              {/* Google button */}
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={googleLoading}
                className="flex w-full h-11 items-center justify-center gap-2.5 rounded-[10px] border text-[13.5px] font-semibold transition-colors hover:opacity-80 disabled:opacity-60"
                style={{ border: '1px solid var(--color-outline)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? '…' : t('auth.signInWithGoogle')}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2.5 my-5 text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="flex-1 h-px" style={{ background: 'var(--color-outline)' }} />
                {t('auth.orContinueWithEmail')}
                <span className="flex-1 h-px" style={{ background: 'var(--color-outline)' }} />
              </div>

              <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
                <FormInput
                  label={t('auth.emailLabel')}
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth.emailPlaceholder')}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <div>
                  <FormInput
                    label={t('auth.passwordLabel')}
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={t('auth.passwordPlaceholder')}
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  {mode === 'login' && (
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(''); }}
                        className="text-[12px] font-medium"
                        style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    </div>
                  )}
                </div>

                {error && <p className="text-xs text-center" style={{ color: 'var(--color-error)' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 h-11 w-full rounded-[10px] text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {loading ? '…' : mode === 'login' ? t('auth.signInButton') : t('auth.registerButton')}
                </button>
              </form>

              <div className="mt-5 text-center text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                {mode === 'login' ? t('auth.newHerePrompt') : t('auth.alreadyHaveAccountPrompt')}{' '}
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="font-semibold"
                  style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {mode === 'login' ? t('auth.registerButton') : t('auth.signInButton')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
