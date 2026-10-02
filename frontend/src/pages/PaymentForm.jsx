import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import CustomerPicker from '../components/CustomerPicker';
import { Field, PageHeader, Segmented } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { fmtDate, money, num, round2, today, uuid } from '../lib/format';
import { submit } from '../lib/outbox';
import { messages, openWhatsApp } from '../lib/whatsapp';

export default function PaymentForm() {
  const [params] = useSearchParams();
  const { settings } = useSettings();
  const { toast } = useUi();

  const [customerId, setCustomerId] = useState(params.get('customer') || '');
  const [customer, setCustomer] = useState(null);
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [isAdvance, setIsAdvance] = useState(false);
  const [notes, setNotes] = useState('');
  const [clientUuid, setClientUuid] = useState(uuid);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const previous = round2(customer?.pending_amount ?? 0);
  const paid = round2(num(amount));
  const remaining = round2(previous - paid);
  const overPaying = paid > Math.max(previous, 0);

  const save = async (e) => {
    e.preventDefault();
    if (!customerId) return setError(t('entry.selectCustomer'));
    if (!(paid > 0)) return setError(t('pay.enterAmount'));
    if (overPaying && !isAdvance) return setError(t('pay.overPending', { amount: money(Math.max(previous, 0)) }));
    setBusy(true);
    setError('');
    try {
      const res = await submit(
        '/payments',
        { client_uuid: clientUuid, customer_id: Number(customerId), payment_date: date, amount: paid, payment_mode: mode, is_advance: isAdvance, notes: notes || null },
        t('pay.outbox', { amount: money(paid), name: customer?.name })
      );
      if (res.queued) {
        toast(t('pay.queuedToast'), 'info');
        setResult({ queued: true, customer_name: customer?.name, amount: paid });
      } else {
        toast(res.data.message || t('pay.receivedOk'));
        setResult(res.data.data);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="card text-center">
          <div className="text-5xl">{result.queued ? '📴' : '✅'}</div>
          <h1 className="mt-2 text-xl font-bold">{result.queued ? t('pay.savedOnPhone') : t('pay.receivedOk')}</h1>
          <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-left">
            <Row label={t('entry.customer')} value={result.customer_name} />
            {!result.queued && <Row label={t('entry.date')} value={fmtDate(result.payment_date)} />}
            {!result.queued && <Row label={t('pay.previousPending')} value={money(result.previous_pending)} />}
            <Row label={t('entry.paid')} value={money(result.amount)} strong />
            {!result.queued && <Row label={t('pay.remainingPending')} value={money(result.remaining_pending)} strong />}
          </div>
        </div>
        {!result.queued && (
          <button className="btn-wa w-full py-4 text-lg" onClick={() => openWhatsApp(result.customer_mobile, messages.payment(settings, result))}>
            {t('pay.sendReceipt')}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="btn-primary"
            onClick={() => {
              setResult(null);
              setAmount('');
              setNotes('');
              setIsAdvance(false);
              setCustomerId('');
              setCustomer(null);
              setClientUuid(uuid());
            }}
          >
            {t('pay.newPayment')}
          </button>
          <Link to="/payments" className="btn-light">
            {t('pay.allPayments')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader title={t('pay.title')} subtitle={t('pay.subtitle')} back />
      <div className="card space-y-4">
        <Field group label={t('entry.customer')}>
          <CustomerPicker value={customerId} includeInactive onChange={(id, c) => { setCustomerId(id || ''); setCustomer(c); }} />
        </Field>
        <Field label={t('pay.date')}>
          <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field group label={t('pay.previousPending')}>
          <div className={`input font-bold ${previous > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50'}`}>
            {previous < 0 ? t('pay.advanceAmt', { amount: money(-previous) }) : money(previous)}
          </div>
        </Field>
        <Field label={t('pay.paidAmount')}>
          <input className="input text-2xl font-bold" inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
        </Field>
        {previous > 0 && (
          <button type="button" className="btn-light btn-sm" onClick={() => setAmount(String(previous))}>
            {t('pay.fullPending', { amount: money(previous) })}
          </button>
        )}
        <Field group label={t('pay.mode')}>
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'cash', label: t('entry.btnCash') },
              { value: 'upi', label: t('entry.btnUpi') },
              { value: 'bank', label: t('entry.btnBank') },
            ]}
          />
        </Field>
        {overPaying && paid > 0 && (
          <label className="flex items-start gap-3 rounded-xl bg-teal-50 p-3 text-teal-900">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-teal-700" checked={isAdvance} onChange={(e) => setIsAdvance(e.target.checked)} />
            <span>
              <b>{t('pay.advancePayment')}</b> {t('pay.advanceNote', { amount: money(paid - Math.max(previous, 0)) })}
            </span>
          </label>
        )}
        <Field group label={t('pay.remainingPending')}>
          <div className={`input font-bold ${remaining > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
            {remaining < 0 ? t('pay.advanceAmt', { amount: money(-remaining) }) : money(remaining)}
          </div>
        </Field>
        <Field label={t('entry.notes')}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder={t('entry.optional')} />
        </Field>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="sticky-above-nav sticky z-20">
        <button className="btn w-full bg-emerald-600 py-4 text-lg text-white shadow-lg" disabled={busy}>
          {busy ? t('entry.saving') : t('pay.save', { amount: paid > 0 ? money(paid) : '' }).trim()}
        </button>
      </div>
    </form>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'font-bold' : 'font-medium'}>{value}</span>
    </div>
  );
}
