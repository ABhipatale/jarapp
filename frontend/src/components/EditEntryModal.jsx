import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { money, num, round2, today } from '../lib/format';
import { Field, Loader, Modal, Segmented, Stepper } from './ui';

/**
 * Correct a saved jar entry or payment (wrong amount, udhari that was really cash, wrong
 * date/quantity…). Customer and entry type can't change here — delete and re-enter for that.
 * The server recalculates everything and applies the same jar/stock/advance rules.
 *
 *   <EditEntryModal kind="jar" | "payment" id={…} onClose={…} onSaved={…} />
 */
export default function EditEntryModal({ kind, id, onClose, onSaved }) {
  const { toast, alert } = useUi();
  const [rec, setRec] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const url = kind === 'jar' ? `/jar-transactions/${id}` : `/payments/${id}`;

  useEffect(() => {
    api
      .get(url)
      .then(({ data }) => {
        const r = data.data;
        setRec(r);
        setForm(
          kind === 'jar'
            ? {
                transaction_date: r.transaction_date,
                jar_quantity: String(r.jar_quantity),
                rate: String(r.rate ?? ''),
                payment_type: r.udhari_amount > 0 ? 'udhari' : 'cash',
                paid: String(r.paid_amount ?? ''),
                advance: r.advance_amount ? String(r.advance_amount) : '',
                notes: r.notes || '',
              }
            : {
                payment_date: r.payment_date,
                amount: String(r.amount),
                payment_mode: r.payment_mode,
                is_advance: !!r.is_advance,
                notes: r.notes || '',
              }
        );
      })
      .catch((err) => {
        toast(errorMessage(err), 'error');
        onClose();
      });
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? v.target.value : v }));
  const money2 = (s) => s.replace(/[^\d.]/g, '');

  const isGive = rec?.transaction_type === 'given';
  const q = parseInt(form?.jar_quantity, 10) || 0;
  const amount = kind === 'jar' && isGive ? round2(q * num(form?.rate)) : 0;
  const paid = form?.payment_type === 'cash' ? amount : Math.min(round2(num(form?.paid)), amount);

  const save = async () => {
    setBusy(true);
    try {
      const body =
        kind === 'jar'
          ? {
              transaction_date: form.transaction_date,
              jar_quantity: q,
              notes: form.notes || null,
              ...(isGive && { rate: num(form.rate), payment_type: form.payment_type, paid_amount: paid, advance_amount: num(form.advance) }),
            }
          : {
              payment_date: form.payment_date,
              amount: num(form.amount),
              payment_mode: form.payment_mode,
              is_advance: form.is_advance,
              notes: form.notes || null,
            };
      const { data } = await api.put(url, body);
      toast(data.message);
      onSaved?.(data.data);
      onClose();
    } catch (err) {
      alert({ title: t('edit.cannotSave'), message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const title = kind === 'payment' ? t('edit.titlePayment') : isGive ? t('edit.titleGive') : t('edit.titleReturn');

  return (
    <Modal title={rec ? title : t('edit.title')} onClose={onClose}>
      {!form ? (
        <Loader />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            👤 <b className="text-slate-800">{rec.customer_name}</b>
            <span className="block text-xs">{t('edit.fixedHint')}</span>
          </div>

          {kind === 'jar' ? (
            <>
              <Field label={t('edit.date')}>
                <input type="date" className="input" value={form.transaction_date} max={today()} onChange={set('transaction_date')} />
              </Field>
              <Field group label={isGive ? t('edit.jarsGiven') : t('edit.jarsReturned')}>
                <Stepper value={form.jar_quantity} onChange={(v) => set('jar_quantity')(String(v))} min={1} />
              </Field>

              {isGive && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('edit.rate')}>
                      <input className="input" inputMode="decimal" value={form.rate} onChange={(e) => set('rate')(money2(e.target.value))} />
                    </Field>
                    <Field group label={t('edit.amount')}>
                      <div className="input bg-slate-50 font-bold">{money(amount)}</div>
                    </Field>
                  </div>
                  <Segmented
                    size="sm"
                    value={form.payment_type}
                    onChange={set('payment_type')}
                    options={[
                      { value: 'cash', label: t('edit.cash'), activeClass: 'bg-emerald-600 text-white ring-emerald-600' },
                      { value: 'udhari', label: t('edit.udhari'), activeClass: 'bg-amber-500 text-white ring-amber-500' },
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('edit.paid')}>
                      <input
                        className="input"
                        inputMode="decimal"
                        disabled={form.payment_type === 'cash'}
                        value={form.payment_type === 'cash' ? amount : form.paid}
                        placeholder="0"
                        onChange={(e) => set('paid')(money2(e.target.value))}
                      />
                    </Field>
                    <Field group label={t('edit.udhariAuto')}>
                      <div className={`input font-bold ${amount - paid > 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-50'}`}>{money(round2(amount - paid))}</div>
                    </Field>
                  </div>
                  <Field label={t('edit.advance')}>
                    <input className="input" inputMode="decimal" value={form.advance} placeholder="0" onChange={(e) => set('advance')(money2(e.target.value))} />
                  </Field>
                </>
              )}
            </>
          ) : (
            <>
              <Field label={t('edit.date')}>
                <input type="date" className="input" value={form.payment_date} max={today()} onChange={set('payment_date')} />
              </Field>
              <Field label={t('edit.paymentAmount')}>
                <input className="input text-xl font-bold" inputMode="decimal" value={form.amount} onChange={(e) => set('amount')(money2(e.target.value))} />
              </Field>
              <Segmented
                size="sm"
                value={form.payment_mode}
                onChange={set('payment_mode')}
                options={[
                  { value: 'cash', label: t('edit.cash') },
                  { value: 'upi', label: 'UPI' },
                  { value: 'bank', label: t('edit.bank') },
                ]}
              />
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" className="h-5 w-5 accent-teal-700" checked={form.is_advance} onChange={(e) => set('is_advance')(e.target.checked)} />
                {t('edit.isAdvance')}
              </label>
            </>
          )}

          <Field label={t('edit.notes')}>
            <input className="input" value={form.notes} onChange={set('notes')} maxLength={500} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-light" onClick={onClose}>
              {t('edit.cancel')}
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={save}>
              {busy ? t('edit.saving') : t('edit.save')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
