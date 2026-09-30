import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import CustomerPicker from '../components/CustomerPicker';
import { Field, PageHeader, Segmented } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
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
    if (!customerId) return setError('Please select a customer.');
    if (!(paid > 0)) return setError('Please enter paid amount.');
    if (overPaying && !isAdvance) return setError(`Payment is more than pending amount (${money(Math.max(previous, 0))}). Tick “Advance payment” to accept extra money.`);
    setBusy(true);
    setError('');
    try {
      const res = await submit(
        '/payments',
        { client_uuid: clientUuid, customer_id: Number(customerId), payment_date: date, amount: paid, payment_mode: mode, is_advance: isAdvance, notes: notes || null },
        `Payment ${money(paid)} – ${customer?.name}`
      );
      if (res.queued) {
        toast('No internet. Payment saved on phone and will sync automatically.', 'info');
        setResult({ queued: true, customer_name: customer?.name, amount: paid });
      } else {
        toast(res.data.message || 'Payment received successfully.');
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
          <h1 className="mt-2 text-xl font-bold">{result.queued ? 'Saved on phone – will sync' : 'Payment received successfully.'}</h1>
          <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-left">
            <Row label="Customer" value={result.customer_name} />
            {!result.queued && <Row label="Date" value={fmtDate(result.payment_date)} />}
            {!result.queued && <Row label="Previous Pending" value={money(result.previous_pending)} />}
            <Row label="Paid" value={money(result.amount)} strong />
            {!result.queued && <Row label="Remaining Pending" value={money(result.remaining_pending)} strong />}
          </div>
        </div>
        {!result.queued && (
          <button className="btn-wa w-full py-4 text-lg" onClick={() => openWhatsApp(result.customer_mobile, messages.payment(settings, result))}>
            📱 Send WhatsApp Receipt
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
            ＋ New Payment
          </button>
          <Link to="/payments" className="btn-light">
            All Payments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader title="Receive Payment" subtitle="पेमेंट जमा" back />
      <div className="card space-y-4">
        <Field group label="Customer">
          <CustomerPicker value={customerId} includeInactive onChange={(id, c) => { setCustomerId(id || ''); setCustomer(c); }} />
        </Field>
        <Field label="Payment Date">
          <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field group label="Previous Pending">
          <div className={`input font-bold ${previous > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50'}`}>
            {previous < 0 ? `${money(-previous)} advance` : money(previous)}
          </div>
        </Field>
        <Field label="Paid Amount (₹)">
          <input className="input text-2xl font-bold" inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
        </Field>
        {previous > 0 && (
          <button type="button" className="btn-light btn-sm" onClick={() => setAmount(String(previous))}>
            Full pending: {money(previous)}
          </button>
        )}
        <Field group label="Payment Mode">
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'cash', label: '💵 Cash' },
              { value: 'upi', label: '📲 UPI' },
              { value: 'bank', label: '🏦 Bank' },
            ]}
          />
        </Field>
        {overPaying && paid > 0 && (
          <label className="flex items-start gap-3 rounded-xl bg-teal-50 p-3 text-teal-900">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-teal-700" checked={isAdvance} onChange={(e) => setIsAdvance(e.target.checked)} />
            <span>
              <b>Advance payment</b> — amount is more than pending. Keep {money(paid - Math.max(previous, 0))} as advance.
            </span>
          </label>
        )}
        <Field group label="Remaining Pending">
          <div className={`input font-bold ${remaining > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
            {remaining < 0 ? `${money(-remaining)} advance` : money(remaining)}
          </div>
        </Field>
        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional" />
        </Field>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="sticky-above-nav sticky z-20">
        <button className="btn w-full bg-emerald-600 py-4 text-lg text-white shadow-lg" disabled={busy}>
          {busy ? 'Saving…' : `Save Payment ${paid > 0 ? money(paid) : ''}`}
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
