import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import CustomerPicker from '../components/CustomerPicker';
import { Empty, ErrorBox, Field, Loader, Modal, PageHeader, Stepper } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { addDays, fmtDate, fmtLongDate, today } from '../lib/format';
import { refreshBell } from '../lib/push';
import { useApi } from '../lib/useApi';
import { messages, openWhatsApp } from '../lib/whatsapp';

/**
 * 📅 Advance jar bookings: "10 jars on 08-10-2026".
 * The owner gets a phone notification the night before (~8 PM) and that morning (~7 AM).
 * "Deliver" opens the normal Give Jar screen pre-filled; saving it closes the booking.
 */
export default function Bookings() {
  const { settings } = useSettings();
  const { toast, confirm, alert } = useUi();
  const { data, loading, error, reload } = useApi('/bookings');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const tomorrow = addDays(today(), 1);
  const groups = groupByDate(data?.open || []);

  const cancel = async (b) => {
    if (!(await confirm({ message: t('book.cancelConfirm', { name: b.customer_name, n: b.jar_quantity, date: fmtDate(b.delivery_date) }), confirmText: t('book.cancelYes') }))) return;
    try {
      await api.post(`/bookings/${b.id}/cancel`);
      toast(t('book.cancelled'));
      reload();
      refreshBell();
    } catch (err) {
      alert({ message: errorMessage(err) });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('book.title')} subtitle={t('book.subtitle')} back />

      <button className="btn-primary w-full py-4 text-lg" onClick={() => setShowForm(true)}>
        {t('book.new')}
      </button>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}

      {data && data.open.length === 0 && <Empty>{t('book.none')}</Empty>}

      {groups.map(([date, items]) => {
        const late = date < today();
        const label = late ? t('book.overdue') : date === today() ? t('book.today') : date === tomorrow ? t('book.tomorrow') : fmtLongDate(date);
        const jars = items.reduce((s, b) => s + b.jar_quantity, 0);
        return (
          <section key={date} className="space-y-2">
            <h2 className={`flex items-center justify-between text-sm font-semibold uppercase tracking-wide ${late ? 'text-red-600' : 'text-slate-500'}`}>
              <span>
                {label} {!late && date !== today() && date !== tomorrow ? '' : `· ${fmtDate(date)}`}
              </span>
              <span className="normal-case">{t('book.dayTotal', { n: items.length, jars })}</span>
            </h2>
            {items.map((b) => (
              <div key={b.id} className={`card !py-3 ${late ? '!ring-red-300' : date === today() ? '!ring-amber-300' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/customers/${b.customer_id}`} className="min-w-0">
                    <div className="truncate font-semibold">{b.customer_name}</div>
                    <div className="text-xs text-slate-500">📅 {fmtDate(b.delivery_date)} · {b.customer_mobile}</div>
                    {b.notes && <div className="mt-0.5 text-sm text-slate-600">📝 {b.notes}</div>}
                  </Link>
                  <div className="shrink-0 text-right text-2xl font-bold text-brand-800">
                    {b.jar_quantity}
                    <span className="block text-xs font-medium text-slate-500">{t('book.jars')}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {date <= today() && (
                    <Link to={`/entry?type=given&customer=${b.customer_id}&qty=${b.jar_quantity}&booking=${b.id}`} className="btn-primary btn-sm">
                      {t('book.deliver')}
                    </Link>
                  )}
                  <button className="btn-wa btn-sm" onClick={() => openWhatsApp(b.customer_mobile, messages.booking(settings, b))}>💬</button>
                  <button className="btn-light btn-sm" onClick={() => setEditing(b)} aria-label={t('book.edit')}>✏️</button>
                  <button className="btn-light btn-sm text-red-600" onClick={() => cancel(b)}>{t('book.cancel')}</button>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {data && data.closed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('book.closed')}</h2>
          {data.closed.map((b) => (
            <div key={b.id} className="card flex items-center justify-between !py-2.5 opacity-70">
              <span className="min-w-0 truncate">
                {b.customer_name} · {b.jar_quantity} {t('book.jars')} · {fmtDate(b.delivery_date)}
              </span>
              <span className={`shrink-0 text-xs font-semibold ${b.status === 'delivered' ? 'text-emerald-700' : 'text-slate-500'}`}>
                {b.status === 'delivered' ? t('book.delivered') : t('book.cancelledLabel')}
              </span>
            </div>
          ))}
        </section>
      )}

      {(showForm || editing) && (
        <BookingForm
          booking={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={(saved, isNew) => {
            setShowForm(false);
            setEditing(null);
            reload();
            refreshBell();
            if (isNew) {
              confirm({ title: t('book.savedTitle'), message: t('book.sendConfirmQ'), confirmText: t('book.sendWa'), danger: false }).then((yes) => {
                if (yes) openWhatsApp(saved.customer_mobile, messages.booking(settings, saved));
              });
            }
          }}
        />
      )}
    </div>
  );
}

function groupByDate(list) {
  const map = new Map();
  for (const b of list) {
    const key = b.delivery_date < today() ? '0000-overdue' : b.delivery_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(b);
  }
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k === '0000-overdue' ? v[0].delivery_date : k, v]);
}

function BookingForm({ booking, onClose, onSaved }) {
  const { alert } = useUi();
  const editing = Boolean(booking);
  const [customerId, setCustomerId] = useState(booking?.customer_id || '');
  const [customer, setCustomer] = useState(null);
  const [date, setDate] = useState(booking?.delivery_date || addDays(today(), 1));
  const [qty, setQty] = useState(String(booking?.jar_quantity || 10));
  const [notes, setNotes] = useState(booking?.notes || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing && !customerId) return alert({ message: t('book.selectCustomer') });
    if (!(parseInt(qty, 10) > 0)) return alert({ message: t('book.qtyMin') });
    setBusy(true);
    try {
      const body = { delivery_date: date, jar_quantity: parseInt(qty, 10), notes: notes || null };
      const { data } = editing ? await api.put(`/bookings/${booking.id}`, body) : await api.post('/bookings', { ...body, customer_id: Number(customerId) });
      const saved = { ...booking, ...data.data, customer_name: editing ? booking.customer_name : customer?.name, customer_mobile: editing ? booking.customer_mobile : customer?.mobile };
      onSaved(saved, !editing);
    } catch (err) {
      alert({ message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? t('book.editTitle') : t('book.new')} onClose={onClose}>
      <div className="space-y-4">
        {editing ? (
          <div className="rounded-xl bg-slate-50 px-3 py-2 font-semibold">👤 {booking.customer_name}</div>
        ) : (
          <Field group label={t('book.customer')}>
            <CustomerPicker value={customerId} onChange={(id, c) => { setCustomerId(id || ''); setCustomer(c); }} />
          </Field>
        )}
        <Field label={t('book.date')} hint={t('book.dateHint')}>
          <input type="date" className="input" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field group label={t('book.qty')}>
          <Stepper value={qty} onChange={(v) => setQty(String(v))} min={1} />
        </Field>
        <Field label={t('book.notes')}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder={t('book.notesPh')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-light" onClick={onClose}>{t('book.close')}</button>
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? t('book.saving') : t('book.save')}</button>
        </div>
      </div>
    </Modal>
  );
}
