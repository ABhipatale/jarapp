import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import CustomerPicker from '../components/CustomerPicker';
import { Field, PageHeader, Segmented, Stepper } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { money, num, round2, today, uuid } from '../lib/format';
import { submit } from '../lib/outbox';
import { messages, openWhatsApp } from '../lib/whatsapp';

export default function DailyEntry() {
  const [params] = useSearchParams();
  const { settings } = useSettings();
  const { toast } = useUi();

  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState(params.get('customer') || '');
  const [customer, setCustomer] = useState(null);
  const [type, setType] = useState(params.get('type') === 'returned' ? 'returned' : 'given');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState(settings.default_rate || '');
  const [payType, setPayType] = useState('cash');
  const [paidInput, setPaidInput] = useState('');
  const [advance, setAdvance] = useState('');
  const [notes, setNotes] = useState('');
  const [clientUuid, setClientUuid] = useState(uuid);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Quick-action links (?type=…) switch the type even when already on this screen.
  useEffect(() => {
    const t = params.get('type');
    if (t === 'given' || t === 'returned') setType(t);
    if (params.get('customer')) setCustomerId(params.get('customer'));
  }, [params]);

  useEffect(() => {
    if (!rate && settings.default_rate) setRate(settings.default_rate);
  }, [settings.default_rate]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = parseInt(qty, 10) || 0;
  const amount = type === 'given' ? round2(q * num(rate)) : 0;
  const paid = payType === 'cash' ? amount : Math.min(round2(num(paidInput)), amount);
  const udhari = round2(amount - paid);
  const jarsNow = customer?.current_jars ?? 0;
  const jarsAfter = type === 'given' ? jarsNow + q : jarsNow - q;

  const problem = useMemo(() => {
    if (!customerId) return 'Please select a customer.';
    if (q < 1) return 'Jar quantity must be at least 1.';
    if (type === 'returned' && q > jarsNow) return jarsNow === 0 ? 'This customer has no jars to return.' : `Customer has only ${jarsNow} jars. Cannot return ${q}.`;
    if (type === 'given' && num(paidInput) > amount && payType === 'udhari') return 'Paid amount cannot be more than the bill amount. Enter the extra as Advance.';
    return '';
  }, [customerId, q, type, jarsNow, paidInput, amount, payType]);

  const save = async (e) => {
    e.preventDefault();
    if (problem) return setError(problem);
    setBusy(true);
    setError('');
    const body = {
      client_uuid: clientUuid,
      customer_id: Number(customerId),
      transaction_date: date,
      transaction_type: type,
      jar_quantity: q,
      notes: notes || null,
      ...(type === 'given' && { rate: num(rate), payment_type: payType, paid_amount: paid, advance_amount: num(advance) }),
    };
    try {
      const res = await submit('/jar-transactions', body, `${type === 'given' ? 'Give' : 'Return'} ${q} jars – ${customer?.name}`);
      if (res.queued) {
        toast('No internet. Entry saved on phone and will sync automatically.', 'info');
        setResult({ queued: true, customer_name: customer?.name, transaction_type: type, jar_quantity: q });
      } else {
        toast(res.data.message || 'Jar entry saved successfully.');
        setResult({ ...res.data.data, customer_name: customer?.name, customer_mobile: customer?.mobile });
        setCustomer((c) => c && { ...c, current_jars: res.data.data.current_jars, pending_amount: res.data.data.pending_amount });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const newEntry = (keepCustomer) => {
    setResult(null);
    setQty('1');
    setPaidInput('');
    setAdvance('');
    setNotes('');
    setPayType('cash');
    setClientUuid(uuid());
    if (!keepCustomer) {
      setCustomerId('');
      setCustomer(null);
    }
  };

  if (result) return <SavedCard result={result} settings={settings} onNew={newEntry} />;

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader title="Daily Jar Entry" subtitle="दैनिक जार नोंद" />

      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: 'given', label: '＋ GIVE JAR', activeClass: 'bg-brand-700 text-white ring-brand-700' },
          { value: 'returned', label: '↩ RETURN JAR', activeClass: 'bg-sky-600 text-white ring-sky-600' },
        ]}
      />

      <div className="card space-y-4">
        <Field label="Date">
          <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field group label="Customer">
          <CustomerPicker
            value={customerId}
            onChange={(id, c) => {
              setCustomerId(id || '');
              setCustomer(c);
            }}
          />
        </Field>
        {customer && (
          <Field label="Mobile Number">
            <input className="input" value={customer.mobile} disabled />
          </Field>
        )}
        <Field group label={type === 'given' ? 'Jars Given' : 'Jars Returned'}>
          <Stepper value={qty} onChange={(v) => setQty(String(v))} min={1} />
        </Field>
        {customer && (
          <p className={`rounded-xl px-3 py-2 text-sm ${jarsAfter < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
            Current jars: <b>{jarsNow}</b> → after this entry: <b>{jarsAfter}</b>
          </p>
        )}
      </div>

      {type === 'given' && (
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate per Jar (₹)">
              <input className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
            <Field group label="Amount">
              <div className="input bg-slate-50 font-bold">{money(amount)}</div>
            </Field>
          </div>

          <Field group label="Payment Type">
            <Segmented
              size="sm"
              value={payType}
              onChange={setPayType}
              options={[
                { value: 'cash', label: '💵 CASH', activeClass: 'bg-emerald-600 text-white ring-emerald-600' },
                { value: 'udhari', label: '📒 UDHARI', activeClass: 'bg-amber-500 text-white ring-amber-500' },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid Amount (₹)" hint={payType === 'udhari' ? 'Part payment, if any' : 'Full amount paid'}>
              <input
                className="input"
                inputMode="decimal"
                disabled={payType === 'cash'}
                value={payType === 'cash' ? amount : paidInput}
                placeholder="0"
                onChange={(e) => setPaidInput(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>
            <Field group label="Udhari (auto)">
              <div className={`input font-bold ${udhari > 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-50'}`}>{money(udhari)}</div>
            </Field>
          </div>

          <Field label="Advance Money (₹)" hint="Extra money received — adjusts old udhari / future bills">
            <input className="input" inputMode="decimal" value={advance} placeholder="0" onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ''))} />
          </Field>
        </div>
      )}

      <div className="card">
        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional" />
        </Field>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="no-print sticky bottom-20 z-20">
        <button className={`${type === 'given' ? 'btn-primary' : 'btn bg-sky-600 text-white'} w-full py-4 text-lg shadow-lg`} disabled={busy}>
          {busy ? 'Saving…' : `Save – ${type === 'given' ? `Give ${q} Jar${q === 1 ? '' : 's'}` : `Return ${q} Jar${q === 1 ? '' : 's'}`}`}
        </button>
      </div>
    </form>
  );
}

function SavedCard({ result, settings, onNew }) {
  const isGive = result.transaction_type === 'given';

  const sendWa = () => {
    const text = isGive ? messages.delivery(settings, result) : messages.returned(settings, result);
    openWhatsApp(result.customer_mobile, text);
  };

  return (
    <div className="space-y-4">
      <div className={`card text-center ${result.queued ? 'ring-amber-300' : 'ring-emerald-300'}`}>
        <div className="text-5xl">{result.queued ? '📴' : '✅'}</div>
        <h1 className="mt-2 text-xl font-bold">{result.queued ? 'Saved on phone' : 'Jar entry saved successfully.'}</h1>
        {result.queued && <p className="text-sm text-slate-600">It will sync automatically when internet is back.</p>}

        <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-left">
          <Row label="Customer" value={result.customer_name} />
          <Row label={isGive ? 'Given' : 'Returned'} value={`${result.jar_quantity} jars`} />
          {!result.queued && (
            <>
              {isGive && (
                <>
                  <Row label="Rate" value={money(result.rate)} />
                  <Row label="Total" value={money(result.amount)} />
                  <Row label="Paid" value={money(result.paid_amount + result.advance_amount)} />
                  <Row label="Udhari" value={money(result.udhari_amount)} />
                </>
              )}
              <Row label="Current Jars" value={result.current_jars} strong />
              <Row label="Total Pending" value={money(result.pending_amount)} strong />
            </>
          )}
        </div>
      </div>

      {!result.queued && (
        <button className="btn-wa w-full py-4 text-lg" onClick={sendWa}>
          📱 Send WhatsApp
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-primary" onClick={() => onNew(false)}>
          ＋ New Entry
        </button>
        <button className="btn-light" onClick={() => onNew(true)}>
          Same Customer
        </button>
      </div>
      {!result.queued && (
        <Link to={`/payments/new?customer=${result.customer_id}`} className="btn-light w-full">
          💰 Receive Payment
        </Link>
      )}
    </div>
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
