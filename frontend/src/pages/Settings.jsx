import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { Field, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { DEFAULT_TEMPLATES } from '../lib/whatsapp';

const TEMPLATES = [
  ['wa_delivery', 'Jar delivery message', '{customer_name} {date} {jar_quantity} {rate} {amount} {paid} {udhari} {current_jars}'],
  ['wa_return', 'Jar return message', '{customer_name} {date} {returned_jars} {current_jars}'],
  ['wa_payment', 'Payment receipt', '{customer_name} {date} {paid_amount} {previous_pending} {remaining_pending}'],
  ['wa_reminder', 'Udhari reminder', '{customer_name} {pending_amount}'],
  ['wa_summary', "Today's summary", '{date} {given} {returned} {cash} {udhari} {payments} {pending}'],
];

export default function Settings() {
  const { setSettings } = useSettings();
  const { user, logout } = useAuth();
  const { toast } = useUi();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setSettings(data);
      setForm(data);
    }).catch((e) => toast(errorMessage(e), 'error'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <p className="py-10 text-center text-slate-500">Loading…</p>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, jar_tracking: form.jar_tracking === '1' || form.jar_tracking === true, total_jars: parseInt(form.total_jars, 10) || 0 };
      const { data } = await api.put('/settings', payload);
      setSettings(data);
      setForm(data);
      toast('Settings saved.');
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
      <PageHeader title="Settings" back />

      <form onSubmit={save} className="space-y-4">
        <section className="card space-y-3">
          <h2 className="font-semibold">Shop</h2>
          <Field label="Business Name">
            <input className="input" value={form.business_name} onChange={set('business_name')} />
          </Field>
          <Field label="Business Name (Marathi, for WhatsApp)">
            <input className="input" value={form.business_name_mr} onChange={set('business_name_mr')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Address">
              <input className="input" value={form.business_address} onChange={set('business_address')} />
            </Field>
            <Field label="Place (Marathi)">
              <input className="input" value={form.business_place_mr} onChange={set('business_place_mr')} />
            </Field>
          </div>
          <Field label="Business Mobile">
            <input className="input" type="tel" value={form.business_mobile || ''} onChange={set('business_mobile')} />
          </Field>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Jars</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Jars Owned" hint="Changing this adds/removes jars in stock">
              <input className="input" inputMode="numeric" value={form.total_jars} onChange={(e) => setForm({ ...form, total_jars: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label="Default Rate per Jar (₹)">
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
            Individual jar tracking (JAR-001, JAR-002…)
          </label>
          <Field label="Expense Types" hint="Comma separated">
            <input className="input" value={form.expense_types} onChange={set('expense_types')} />
          </Field>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">WhatsApp Messages</h2>
          <p className="text-sm text-slate-500">
            Leave a box empty to use the standard message. You can also use {'{shop_name}'} and {'{shop_place}'}.
          </p>
          {TEMPLATES.map(([key, label, vars]) => (
            <Field key={key} label={label} hint={`Values: ${vars}`}>
              <textarea className="input font-mono text-sm" rows={6} value={form[key] || ''} placeholder={DEFAULT_TEMPLATES[key]} onChange={set(key)} />
            </Field>
          ))}
        </section>

        <div className="sticky bottom-20 z-20">
          <button className="btn-primary w-full py-4 shadow-lg" disabled={busy}>
            {busy ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="card space-y-3">
        <h2 className="font-semibold">Change Password</h2>
        <p className="text-sm text-slate-500">Logged in as {user?.email}</p>
        <input className="input" type="password" placeholder="Current password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
        <input className="input" type="password" placeholder="New password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
        <input className="input" type="password" placeholder="Repeat new password" autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} />
        <button className="btn-light w-full">Change Password</button>
      </form>

      <button className="btn-light w-full text-red-600" onClick={logout}>
        🚪 Logout
      </button>
    </div>
  );
}
