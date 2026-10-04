import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { Empty, ErrorBox, Loader, PageHeader, PendingText } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { fmtDate } from '../lib/format';
import { currentSubscription, disablePush, enablePush, pushSupported, refreshBell } from '../lib/push';
import { useApi } from '../lib/useApi';
import { messages, openWhatsApp } from '../lib/whatsapp';

/** 🔔 All jar reminders: due today/overdue, upcoming and recently completed. */
export default function Notifications() {
  const { settings } = useSettings();
  const { toast, confirm } = useUi();
  const { data, loading, error, reload } = useApi('/notifications');
  const [pushOn, setPushOn] = useState(null); // null = checking
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentSubscription().then((s) => setPushOn(Boolean(s)));
  }, []);

  // Opening this screen marks today's reminders as seen.
  useEffect(() => {
    if (data?.due?.length) api.post('/notifications/read').then(refreshBell).catch(() => {});
  }, [data]);

  const turnOn = async () => {
    setBusy(true);
    try {
      await enablePush();
      setPushOn(true);
      toast(t('notif.pushOnToast'));
    } catch (err) {
      const key = { unsupported: 'notif.errUnsupported', denied: 'notif.errDenied', nosw: 'notif.errNoSw', server: 'notif.errServer' }[err.message];
      toast(key ? t(key) : errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    await disablePush();
    setPushOn(false);
    toast(t('notif.pushOffToast'), 'info');
  };

  const done = async (r) => {
    try {
      await api.post(`/notifications/${r.id}/done`);
      toast(t('notif.doneToast'));
      reload();
      refreshBell();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const remove = async (r) => {
    if (!(await confirm({ message: t('notif.deleteConfirm', { name: r.customer_name, date: fmtDate(r.remind_on) }) }))) return;
    try {
      await api.delete(`/notifications/${r.id}`);
      reload();
      refreshBell();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const sendWa = (r) => {
    const c = { name: r.customer_name, pending_amount: r.pending_amount };
    openWhatsApp(r.customer_mobile, r.pending_amount > 0 ? messages.reminder(settings, c) : `नमस्कार ${r.customer_name},\n\n`);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('notif.title')} back />

      {/* Phone notification switch */}
      <div className={`card ${pushOn ? '!bg-emerald-50 !ring-emerald-200' : '!bg-sky-50 !ring-sky-200'}`}>
        {!pushSupported() ? (
          <p className="text-sm text-slate-700">{t('notif.unsupportedHint')}</p>
        ) : pushOn ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-emerald-800">{t('notif.pushIsOn')}</span>
            <button className="btn-light btn-sm" onClick={turnOff}>{t('notif.turnOff')}</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">{t('notif.pushHint')}</p>
            <button className="btn-primary w-full" disabled={busy || pushOn === null} onClick={turnOn}>
              {busy ? t('notif.turningOn') : t('notif.turnOn')}
            </button>
          </div>
        )}
      </div>

      <Link to="/bookings" className="card flex items-center justify-between !py-3">
        <span className="font-semibold">📅 {t('book.seeAll')}</span>
        <span className="text-brand-700">›</span>
      </Link>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}

      {data && (
        <>
          <Section title={t('notif.due')} count={data.due.length}>
            {data.due.length === 0 ? (
              <Empty>{t('notif.noneDue')}</Empty>
            ) : (
              data.due.map((r) => (
                <ReminderCard key={r.id} r={r} highlight>
                  <button className="btn-wa btn-sm" onClick={() => sendWa(r)}>💬 WhatsApp</button>
                  <a className="btn-light btn-sm" href={`tel:${r.customer_mobile}`}>📞</a>
                  <button className="btn-primary btn-sm" onClick={() => done(r)}>{t('notif.markDone')}</button>
                </ReminderCard>
              ))
            )}
          </Section>

          <Section title={t('notif.upcoming')} count={data.upcoming.length}>
            {data.upcoming.length === 0 ? (
              <Empty>{t('notif.noneUpcoming')}</Empty>
            ) : (
              data.upcoming.map((r) => (
                <ReminderCard key={r.id} r={r}>
                  <button className="btn-light btn-sm text-red-600" onClick={() => remove(r)} aria-label={t('notif.delete')}>🗑</button>
                </ReminderCard>
              ))
            )}
          </Section>

          {data.done.length > 0 && (
            <Section title={t('notif.done')} count={data.done.length}>
              {data.done.map((r) => (
                <ReminderCard key={r.id} r={r} muted />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} ({count})
      </h2>
      {children}
    </section>
  );
}

function ReminderCard({ r, highlight, muted, children }) {
  return (
    <div className={`card !py-3 ${highlight ? '!ring-amber-300' : ''} ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <Link to={`/customers/${r.customer_id}`} className="min-w-0">
          <div className="truncate font-semibold">
            {highlight && !r.read && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />}
            {r.customer_name}
          </div>
          <div className="text-xs text-slate-500">
            {t('notif.daysLabel', { n: r.days })} · {t('notif.givenLine', { date: fmtDate(r.given_on), n: r.jar_quantity })}
          </div>
        </Link>
        <div className="shrink-0 text-right text-sm">
          <div className="font-semibold">🔔 {fmtDate(r.remind_on)}</div>
          <div>💧 {r.current_jars} · <PendingText amount={r.pending_amount} /></div>
        </div>
      </div>
      {r.auto_done && <p className="mt-1 text-xs text-emerald-700">{t('notif.autoDone')}</p>}
      {children && <div className="mt-2 flex justify-end gap-2">{children}</div>}
    </div>
  );
}
