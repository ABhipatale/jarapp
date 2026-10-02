import { useState } from 'react';
import { Link } from 'react-router-dom';
import RangeFilter, { initialRange } from '../components/RangeFilter';
import { Empty, ErrorBox, Loader, PendingText, StatCard } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { t } from '../i18n';
import { fmtDate, fmtLongDate, money, today } from '../lib/format';
import { useApi } from '../lib/useApi';
import { messages, openWhatsApp } from '../lib/whatsapp';

const QUICK = [
  { to: '/entry?type=given', label: t('common.giveJar'), icon: '＋', cls: 'bg-brand-700 text-white' },
  { to: '/entry?type=returned', label: t('common.returnJar'), icon: '↩', cls: 'bg-sky-600 text-white' },
  { to: '/payments/new', label: t('common.receivePayment'), icon: '💰', cls: 'bg-emerald-600 text-white' },
  { to: '/customers/new', label: t('cust.add'), icon: '👤', cls: 'bg-white text-slate-800 ring-1 ring-slate-200' },
];

export default function Dashboard() {
  const { settings } = useSettings();
  const [range, setRange] = useState(initialRange('today'));
  const { data, loading, error, reload } = useApi('/dashboard', { from: range.from, to: range.to });

  const isToday = range.from === today() && range.to === today();
  const label = isToday ? t('dash.today') : range.preset === 'yesterday' ? t('dash.yesterday') : '';
  const p = data?.period;
  const s = data?.stock;

  const sendSummary = () => {
    const d = data.today;
    openWhatsApp(
      null,
      messages.summary(settings, {
        date: today(),
        given: d.given,
        returned: d.returned,
        cash: d.cash,
        udhari: d.udhari,
        payments: d.payments,
        pending: d.pending,
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-500">{fmtLongDate()}</p>
          <h1 className="text-xl font-bold">{t('dash.hello')}</h1>
        </div>
        {!isToday && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {fmtDate(range.from)}
            {range.to !== range.from && ` – ${fmtDate(range.to)}`}
          </span>
        )}
      </div>

      {/* Quick actions — one tap each */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className={`flex items-center gap-3 rounded-2xl px-4 py-4 text-base font-bold shadow-sm active:scale-[.98] ${q.cls}`}>
            <span className="text-2xl leading-none">{q.icon}</span>
            {q.label}
          </Link>
        ))}
        <button onClick={sendSummary} disabled={!data} className="btn-wa col-span-2 rounded-2xl py-4 text-base">
          📱 {t('dash.sendSummary')}
        </button>
      </div>

      <RangeFilter value={range} onChange={setRange} />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}

      {data && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('dash.jarsNow')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t('dash.availableJars')} value={s.available_jars} icon="✅" tone="green" to="/jars" />
              <StatCard label={t('dash.withCustomers')} value={s.customer_jars} icon="🏠" tone="blue" to="/reports/jar-status" />
              <StatCard label={t('dash.totalJars')} value={s.total_jars} icon="💧" tone="slate" to="/jars" />
              <StatCard label={t('dash.damagedLost')} value={s.damaged_jars + s.lost_jars} icon="⚠️" tone="red" to="/jars" sub={t('dash.damagedLostSub', { damaged: s.damaged_jars, lost: s.lost_jars })} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{label ? t('dash.businessOf', { p: label }) : t('dash.businessPeriod')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t('dash.jarsGiven', { p: label }).trim()} value={p.given} icon="📤" tone="blue" />
              <StatCard label={t('dash.jarsReturned', { p: label }).trim()} value={p.returned} icon="📥" tone="purple" />
              <StatCard label={t('dash.cash', { p: label }).trim()} value={money(p.cash)} icon="💵" tone="green" sub={p.payments_upi + p.payments_bank > 0 ? t('dash.upiBank', { amount: money(p.payments_upi + p.payments_bank) }) : null} />
              <StatCard label={t('dash.udhari', { p: label }).trim()} value={money(p.udhari)} icon="📒" tone="amber" />
              <StatCard label={t('dash.paymentsReceived')} value={money(p.payments)} icon="🧾" tone="green" to="/payments" />
              <StatCard label={t('common.totalPending')} value={money(p.pending)} icon="⏳" tone="red" to="/reports/pending" sub={t('dash.pendingSub')} />
              <StatCard label={t('dash.expenses', { p: label }).trim()} value={money(p.expenses)} icon="🧾" tone="slate" to="/expenses" sub={t('dash.thisMonth', { amount: money(data.month_expenses) })} />
              <StatCard label={t('dash.netCash')} value={money(p.net_cash)} icon="💰" tone={p.net_cash >= 0 ? 'green' : 'red'} sub={t('dash.netCashSub')} />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label ? t('dash.entriesOf', { p: label }) : t('dash.entriesPeriod')}</h2>
              <Link to="/transactions" className="text-sm font-semibold text-brand-700">
                {t('dash.allEntries')} ›
              </Link>
            </div>
            {data.customers.length === 0 ? (
              <Empty>{t('dash.noEntries')}</Empty>
            ) : (
              <div className="space-y-3">
                {data.customers.map((c) => (
                  <Link key={c.customer_id} to={`/customers/${c.customer_id}`} className="card block active:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-sm text-slate-500">
                        {t('dash.nowHolds')} <b className="text-slate-800">{c.current_jars}</b> {t('common.jarsWord')}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                      <Mini label={t('ledger.given')} value={c.given} />
                      <Mini label={t('ledger.returned')} value={c.returned} />
                      <Mini label={t('ledger.netJar')} value={c.net_jars} />
                      <Mini label={t('ledger.amount')} value={money(c.amount)} />
                      <Mini label={t('ledger.paid')} value={money(c.paid + c.payments)} tone="text-emerald-700" />
                      <Mini label={t('ledger.udhari')} value={money(c.udhari)} tone="text-amber-700" />
                    </div>
                    <div className="mt-2 text-right text-sm text-slate-500">
                      {t('dash.totalPendingColon')} <PendingText amount={c.pending_amount} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Mini({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
