import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Globe, Loader2, LogIn } from 'lucide-react';
import logoStacked from '../../assets/logo-stacked.png';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import { Field, Input } from '../../components/forms/Fields';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const schema = z.object({ email: z.string().email(t('fields.email')), password: z.string().min(1, t('common.required')) });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-navy-800 lg:block">
        {/* stationery-style wave bars */}
        <div className="absolute bottom-0 start-0 h-6 w-[45%] rounded-se-[40px] bg-brand-400/60" />
        <div className="absolute bottom-0 start-[45%] h-5 w-[25%] rounded-se-[40px] bg-navy-700" />
        <div className="absolute bottom-0 start-[70%] h-3 w-[30%] rounded-se-[40px] bg-white/30" />
        <div className="flex h-full flex-col justify-center px-16 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">SEEDA ERP</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">{t('app.tagline')}</h1>
          <p className="mt-4 max-w-md text-white/75">{t('dashboard.subtitle')}</p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 text-center text-xs">
            {['employees', 'attendance', 'payroll'].map((k) => <div key={k} className="rounded-2xl bg-white/10 px-3 py-4 backdrop-blur">{t(`nav.${k}`)}</div>)}
          </div>
        </div>
      </div>
      <div className="flex flex-col bg-surface">
        <div className="flex justify-end p-4">
          <button type="button" className="btn-ghost text-xs" onClick={() => changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}><Globe className="h-4 w-4" />{t('common.switchLang')}</button>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <img src={logoStacked} alt="SEEDA" className="mx-auto mb-8 h-28" />
            <h2 className="text-center text-xl font-semibold text-navy-700">{t('auth.title')}</h2>
            <p className="mb-8 mt-1 text-center text-sm text-ink-muted">{t('auth.subtitle')}</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Field label={t('auth.email')} error={errors.email?.message}><Input type="email" autoComplete="username" dir="ltr" {...register('email')} /></Field>
              <Field label={t('auth.password')} error={errors.password?.message}><Input type="password" autoComplete="current-password" dir="ltr" {...register('password')} /></Field>
              {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.signingIn')}</> : <><LogIn className="h-4 w-4 rtl:-scale-x-100" />{t('auth.signIn')}</>}
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-ink-muted">{t('auth.demoHint')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
