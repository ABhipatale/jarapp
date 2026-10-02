import { useState } from 'react';
import api, { errorMessage } from '../api/client';
import RangeFilter, { initialRange } from '../components/RangeFilter';
import { Badge, Empty, ErrorBox, Field, Loader, PageHeader, Segmented } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { fmtDate, money, num, today, uuid } from '../lib/format';
import { submit } from '../lib/outbox';
import { useApi } from '../lib/useApi';

export default function Expenses() {
  const { settings } = useSettings();
  const { toast, confirm } = useUi();
  const [range, setRange] = useState(initialRange('month'));
  const { data, loading, error, reload } = useApi('/expenses', { from: range.from, to: range.to });
  const types = (settings.expense_types || 'इतर').split(',').map((s) => s.trim()).filter(Boolean);

  const blank = () => ({ expense_date: today(), expense_type: types[0] || '', amount: '', payment_mode: 'cash', notes: '', client_uuid: uuid() });
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (!form.expense_type.trim()) return setFormError(t('exp.enterType'));
    if (!(num(form.amount) > 0)) return setFormError(t('exp.enterAmount'));
    setBusy(true);
    setFormError('');
    try {
      const res = await submit('/expenses', { ...form, amount: num(form.amount) }, t('exp.outbox', { amount: money(form.amount), type: form.expense_type }));
      toast(res.queued ? t('exp.queuedToast') : t('exp.savedOk'), res.queued ? 'info' : 'success');
      setForm(blank());
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (x) => {
    if (!(await confirm({ message: t('exp.confirmDelete', { type: x.expense_type, amount: money(x.amount) }) }))) return;
    try {
      await api.delete(`/expenses/${x.id}`);
      toast(t('exp.deleted'));
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('exp.title')} back />

      <form onSubmit={save} className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('entry.date')}>
            <input type="date" className="input" value={form.expense_date} max={today()} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </Field>
          <Field label={t('exp.amount')}>
            <input className="input" inputMode="decimal" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, '') })} />
          </Field>
        </div>
        <Field label={t('exp.type')}>
          <input className="input" list="expense-types" value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value })} />
          <datalist id="expense-types">
            {types.map((ty) => (
              <option key={ty} value={ty} />
            ))}
          </datalist>
        </Field>
        <Segmented
          size="sm"
          value={form.payment_mode}
          onChange={(v) => setForm({ ...form, payment_mode: v })}
          options={[
            { value: 'cash', label: t('entry.btnCash') },
            { value: 'upi', label: t('entry.btnUpi') },
            { value: 'bank', label: t('entry.btnBank') },
          ]}
        />
        <input className="input" placeholder={t('exp.notesPh')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t('entry.saving') : t('exp.save')}
        </button>
      </form>

      <RangeFilter value={range} onChange={setRange} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {data && (
        <div className="card flex items-center justify-between">
          <span className="text-slate-600">{t('exp.total')}</span>
          <span className="text-xl font-bold">{money(data.total)}</span>
        </div>
      )}
      {data && data.data.length === 0 && <Empty>{t('exp.empty')}</Empty>}
      <div className="space-y-2">
        {data?.data.map((x) => (
          <div key={x.id} className="card flex items-center justify-between gap-3 !py-3">
            <div className="min-w-0">
              <div className="font-semibold">{x.expense_type}</div>
              <div className="text-sm text-slate-500">
                {fmtDate(x.expense_date)} · <Badge kind={x.payment_mode}>{{ cash: t('entry.modeCash'), upi: 'UPI', bank: t('entry.modeBank') }[x.payment_mode] || x.payment_mode.toUpperCase()}</Badge>
                {x.notes && ` · ${x.notes}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{money(x.amount)}</span>
              <button className="p-1 text-red-600" onClick={() => remove(x)} aria-label={t('entry.delete')}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
