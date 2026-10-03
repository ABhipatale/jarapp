import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { Field, PageHeader, Segmented } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { LANGS, lang, setLang, t } from '../i18n';
import { DEFAULT_TEMPLATES, getWaApp, setWaApp } from '../lib/whatsapp';

const TEMPLATES = [
  ['wa_delivery', t('set.tplDelivery'), '{customer_name} {date} {jar_quantity} {rate} {amount} {paid} {udhari} {current_jars}'],
  ['wa_return', t('set.tplReturn'), '{customer_name} {date} {returned_jars} {current_jars}'],
  ['wa_payment', t('set.tplPayment'), '{customer_name} {date} {paid_amount} {previous_pending} {remaining_pending}'],
  ['wa_reminder', t('set.tplReminder'), '{customer_name} {pending_amount}'],
  ['wa_summary', t('set.tplSummary'), '{date} {given} {returned} {cash} {udhari} {payments} {pending}'],
];

export default function Settings() {
  const { setSettings } = useSettings();
  const { user, logout } = useAuth();
  const { toast } = useUi();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [waApp, setWaAppState] = useState(getWaApp);

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setSettings(data);
      setForm(data);
    }).catch((e) => toast(errorMessage(e), 'error'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <p className="py-10 text-center text-slate-500">{t('set.loading')}</p>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, jar_tracking: form.jar_tracking === '1' || form.jar_tracking === true, total_jars: parseInt(form.total_jars, 10) || 0 };
      const { data } = await api.put('/settings', payload);
      setSettings(data);
      setForm(data);
      toast(t('set.saved'));
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/me/password', pw);
      toast(data.message);
      setPw({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('set.title')} back />

      <section className="card space-y-3">
        <h2 className="font-semibold">{t('set.language')}</h2>
        <Segmented value={lang} onChange={(v) => v !== lang && setLang(v)} options={Object.entries(LANGS).map(([value, label]) => ({ value, label }))} />
        <p className="text-sm text-slate-500">{t('set.languageHint')}</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">{t('set.waApp')}</h2>
        <Segmented
          size="sm"
          value={waApp}
          onChange={(v) => {
            setWaApp(v);
            setWaAppState(v);
            toast(t('set.waAppSaved'));
          }}
          options={[
            { value: 'business', label: t('set.waAppBusiness'), activeClass: 'bg-[#25D366] text-white ring-[#25D366]' },
            { value: 'normal', label: t('set.waAppNormal'), activeClass: 'bg-[#25D366] text-white ring-[#25D366]' },
          ]}
        />
        <p className="text-sm text-slate-500">{t('set.waAppHint')}</p>
      </section>

      <form onSubmit={save} className="space-y-4">
        <section className="card space-y-3">
          <h2 className="font-semibold">{t('set.shop')}</h2>
          <Field label={t('set.businessName')}>
            <input className="input" value={form.business_name} onChange={set('business_name')} />
          </Field>
          <Field label={t('set.businessNameMr')}>
            <input className="input" value={form.business_name_mr} onChange={set('business_name_mr')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('set.address')}>
              <input className="input" value={form.business_address} onChange={set('business_address')} />
            </Field>
            <Field label={t('set.placeMr')}>
              <input className="input" value={form.business_place_mr} onChange={set('business_place_mr')} />
            </Field>
          </div>
          <Field label={t('set.businessMobile')}>
            <input className="input" type="tel" value={form.business_mobile || ''} onChange={set('business_mobile')} />
          </Field>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">{t('set.jars')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('set.totalJars')} hint={t('set.totalJarsHint')}>
              <input className="input" inputMode="numeric" value={form.total_jars} onChange={(e) => setForm({ ...form, total_jars: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label={t('set.defaultRate')}>
              <input className="input" inputMode="decimal" value={form.default_rate} onChange={set('default_rate')} />
            </Field>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-700"
              checked={form.jar_tracking === '1' || form.jar_tracking === true}
              onChange={(e) => setForm({ ...form, jar_tracking: e.target.checked ? '1' : '0' })}
            />
            {t('set.jarTracking')}
          </label>
          <Field label={t('set.expenseTypes')} hint={t('set.expenseTypesHint')}>
            <input className="input" value={form.expense_types} onChange={set('expense_types')} />
          </Field>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">{t('set.waMessages')}</h2>
          <p className="text-sm text-slate-500">
            {t('set.waHint')}
          </p>
          {TEMPLATES.map(([key, label, vars]) => (
            <Field key={key} label={label} hint={t('set.values', { vars })}>
              <textarea className="input font-mono text-sm" rows={6} value={form[key] || ''} placeholder={DEFAULT_TEMPLATES[key]} onChange={set(key)} />
            </Field>
          ))}
        </section>

        <div className="sticky-above-nav sticky z-20">
          <button className="btn-primary w-full py-4 shadow-lg" disabled={busy}>
            {busy ? t('entry.saving') : t('set.save')}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="card space-y-3">
        <h2 className="font-semibold">{t('set.changePassword')}</h2>
        <p className="text-sm text-slate-500">{t('set.loggedInAs', { email: user?.email || '' })}</p>
        <input className="input" type="password" placeholder={t('set.currentPassword')} autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
        <input className="input" type="password" placeholder={t('set.newPassword')} autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
        <input className="input" type="password" placeholder={t('set.repeatPassword')} autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} />
        <button className="btn-light w-full">{t('set.changePassword')}</button>
      </form>

      <button className="btn-light w-full text-red-600" onClick={logout}>
        {t('set.logout')}
      </button>
    </div>
  );
}
