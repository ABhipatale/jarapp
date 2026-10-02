import { useState } from 'react';
import banner from '../assets/banner.jpg';
import { errorMessage } from '../api/client';
import { DevCredit } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { LANGS, lang, setLang, t } from '../i18n';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ login: '', password: '', remember: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.login.trim()) return setError(t('login.enterLogin'));
    if (!form.password) return setError(t('login.enterPassword'));
    setBusy(true);
    setError('');
    try {
      await login(form.login.trim(), form.password, form.remember);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white">
      <img src={banner} alt={t('login.bannerAlt')} className="w-full object-cover" />
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-brand-800">{t('common.businessName')}</h1>
            <p className="text-slate-500">{t('login.subtitle')}</p>
          </div>
          <div className="flex shrink-0 gap-1" role="group" aria-label={t('login.language')}>
            {Object.entries(LANGS).map(([code, name]) => (
              <button
                key={code}
                type="button"
                onClick={() => code !== lang && setLang(code)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                  code === lang ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-600 ring-slate-300'
                }`}
                aria-pressed={code === lang}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">{t('login.emailOrMobile')}</span>
          <input
            className="input"
            autoComplete="username"
            inputMode="email"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="label">{t('login.password')}</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-3 text-slate-700">
          <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
          {t('login.remember')}
        </label>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button className="btn-primary mt-2 py-4 text-lg" disabled={busy}>
          {busy ? t('login.loggingIn') : t('login.login')}
        </button>

        <DevCredit className="mt-auto pt-6" />
      </form>
    </div>
  );
}
