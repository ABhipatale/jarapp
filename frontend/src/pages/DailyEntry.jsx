import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import CustomerPicker from '../components/CustomerPicker';
import { Field, PageHeader, Segmented, Stepper } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { money, num, round2, today, uuid } from '../lib/format';
import { submit } from '../lib/outbox';
import { messages, openWhatsApp } from '../lib/whatsapp';

export default function DailyEntry() {
  const [params] = useSearchParams();
  const { settings } = useSettings();
  const { toast, alert } = useUi();
  const navigate = useNavigate();

  // Problems are shown in a small popup. Stock problems offer a shortcut to add jars.
  const showProblem = async (message) => {
    const stock = /उपलब्ध|स्टॉकमध्ये जार नाहीत|available in the shop|No jars in stock/i.test(message);
    const goAddJars = await alert({
      title: stock ? t('entry.notEnoughJars') : t('entry.cannotSave'),
      icon: stock ? '💧' : '⚠️',
      message,
      actionText: stock ? t('entry.addJars') : undefined,
    });
    if (goAddJars) navigate('/jars');
  };

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
  const [result, setResult] = useState(null);
  // Jars currently in the shop (null = unknown, e.g. offline). The server checks again on save.
  const [available, setAvailable] = useState(null);

  const loadStock = () =>
    api.get('/jars/summary').then((r) => setAvailable(r.data.available_jars)).catch(() => {});

  useEffect(() => {
    loadStock();
  }, []);

  // Quick-action links (?type=…) switch the type even when already on this screen.
  useEffect(() => {
    const ty = params.get('type');
    if (ty === 'given' || ty === 'returned') setType(ty);
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
    if (!customerId) return t('entry.selectCustomer');
    if (q < 1) return t('entry.qtyMin');
    if (type === 'given' && available !== null && q > available)
      return available <= 0 ? t('entry.noneAvailable') : t('entry.onlyAvailable', { n: available, q });
    if (type === 'returned' && q > jarsNow) return jarsNow === 0 ? t('entry.noJarsToReturn') : t('entry.onlyWithCustomer', { n: jarsNow, q });
    if (type === 'given' && num(paidInput) > amount && payType === 'udhari') return t('entry.paidTooMuch');
    return '';
  }, [customerId, q, type, jarsNow, available, paidInput, amount, payType]);

  const save = async (e) => {
    e.preventDefault();
    if (problem) return showProblem(problem);
    setBusy(true);
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
      const res = await submit('/jar-transactions', body, t(type === 'given' ? 'entry.outboxGive' : 'entry.outboxReturn', { q, name: customer?.name }));
      if (res.queued) {
        toast(t('entry.queuedToast'), 'info');
        setResult({ queued: true, customer_name: customer?.name, transaction_type: type, jar_quantity: q });
      } else {
        toast(res.data.message || t('entry.savedOk'));
        setResult({ ...res.data.data, customer_name: customer?.name, customer_mobile: customer?.mobile });
        setCustomer((c) => c && { ...c, current_jars: res.data.data.current_jars, pending_amount: res.data.data.pending_amount });
        loadStock();
      }
    } catch (err) {
      showProblem(errorMessage(err));
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
      <PageHeader title={t('entry.title')} />

      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: 'given', label: t('entry.give'), activeClass: 'bg-brand-700 text-white ring-brand-700' },
          { value: 'returned', label: t('entry.return'), activeClass: 'bg-sky-600 text-white ring-sky-600' },
        ]}
      />

      <div className="card space-y-4">
        <Field label={t('entry.date')}>
          <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field group label={t('entry.customer')}>
          <CustomerPicker
            value={customerId}
            onChange={(id, c) => {
              setCustomerId(id || '');
              setCustomer(c);
            }}
          />
        </Field>
        {customer && (
          <Field label={t('entry.mobile')}>
            <input className="input" value={customer.mobile} disabled />
          </Field>
        )}
        <Field group label={type === 'given' ? t('entry.howManyGiven') : t('entry.howManyReturned')}>
          <Stepper value={qty} onChange={(v) => setQty(String(v))} min={1} />
        </Field>
        {customer && (
          <p className={`rounded-xl px-3 py-2 text-sm ${jarsAfter < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
            {t('entry.currentJars')} <b>{jarsNow}</b> → {t('entry.afterEntry')} <b>{jarsAfter}</b>
          </p>
        )}
        {type === 'given' && available !== null && (
          <p className={`rounded-xl px-3 py-2 text-sm ${q > available ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
            {t('entry.availableInShop')} <b>{available}</b> {t('entry.jarsWord')}
            {q > available && (
              <>
                {' '}
                — <Link to="/jars" className="font-semibold underline">{t('entry.addJars')}</Link>
              </>
            )}
          </p>
        )}
      </div>

      {type === 'given' && (
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('entry.rate')}>
              <input className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
            <Field group label={t('entry.amount')}>
              <div className="input bg-slate-50 font-bold">{money(amount)}</div>
            </Field>
          </div>

          <Field group label={t('entry.payType')}>
            <Segmented
              size="sm"
              value={payType}
              onChange={setPayType}
              options={[
                { value: 'cash', label: t('entry.payCash'), activeClass: 'bg-emerald-600 text-white ring-emerald-600' },
                { value: 'udhari', label: t('entry.payUdhari'), activeClass: 'bg-amber-500 text-white ring-amber-500' },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('entry.paidAmount')} hint={payType === 'udhari' ? t('entry.partPaid') : t('entry.fullPaid')}>
              <input
                className="input"
                inputMode="decimal"
                disabled={payType === 'cash'}
                value={payType === 'cash' ? amount : paidInput}
                placeholder="0"
                onChange={(e) => setPaidInput(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>
            <Field group label={t('entry.udhariAuto')}>
              <div className={`input font-bold ${udhari > 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-50'}`}>{money(udhari)}</div>
            </Field>
          </div>

          <Field label={t('entry.advanceMoney')} hint={t('entry.advanceHint')}>
            <input className="input" inputMode="decimal" value={advance} placeholder="0" onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ''))} />
          </Field>
        </div>
      )}

      <div className="card">
        <Field label={t('entry.notes')}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder={t('entry.optional')} />
        </Field>
      </div>


      <div className="no-print sticky-above-nav sticky z-20">
        <button className={`${type === 'given' ? 'btn-primary' : 'btn bg-sky-600 text-white'} w-full py-4 text-lg shadow-lg`} disabled={busy}>
          {busy ? t('entry.saving') : t(type === 'given' ? 'entry.saveGive' : 'entry.saveReturn', { q })}
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
        <h1 className="mt-2 text-xl font-bold">{result.queued ? t('entry.savedOnPhone') : t('entry.savedOk')}</h1>
        {result.queued && <p className="text-sm text-slate-600">{t('entry.willSync')}</p>}

        <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-left">
          <Row label={t('entry.customer')} value={result.customer_name} />
          <Row label={isGive ? t('entry.given') : t('entry.returned')} value={t('entry.jarsN', { n: result.jar_quantity })} />
          {!result.queued && (
            <>
              {isGive && (
                <>
                  <Row label={t('entry.rateShort')} value={money(result.rate)} />
                  <Row label={t('entry.total')} value={money(result.amount)} />
                  <Row label={t('entry.paid')} value={money(result.paid_amount + result.advance_amount)} />
                  <Row label={t('entry.udhari')} value={money(result.udhari_amount)} />
                </>
              )}
              <Row label={t('entry.currentJarsRow')} value={result.current_jars} strong />
              <Row label={t('entry.totalPending')} value={money(result.pending_amount)} strong />
            </>
          )}
        </div>
      </div>

      {!result.queued && (
        <button className="btn-wa w-full py-4 text-lg" onClick={sendWa}>
          {t('entry.sendWa')}
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-primary" onClick={() => onNew(false)}>
          {t('entry.newEntry')}
        </button>
        <button className="btn-light" onClick={() => onNew(true)}>
          {t('entry.sameCustomer')}
        </button>
      </div>
      {!result.queued && (
        <Link to={`/payments/new?customer=${result.customer_id}`} className="btn-light w-full">
          {t('entry.receivePayment')}
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
