import { useState } from 'react';
import { Link } from 'react-router-dom';
import RangeFilter, { initialRange } from '../components/RangeFilter';
import { Empty, ErrorBox, Loader, PendingText, StatCard } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { fmtDate, fmtLongDate, money, today } from '../lib/format';
import { useApi } from '../lib/useApi';
import { messages, openWhatsApp } from '../lib/whatsapp';

const QUICK = [
  { to: '/entry?type=given', label: 'Give Jar', icon: '＋', cls: 'bg-brand-700 text-white' },
  { to: '/entry?type=returned', label: 'Return Jar', icon: '↩', cls: 'bg-sky-600 text-white' },
  { to: '/payments/new', label: 'Receive Payment', icon: '💰', cls: 'bg-emerald-600 text-white' },
  { to: '/customers/new', label: 'Add Customer', icon: '👤', cls: 'bg-white text-slate-800 ring-1 ring-slate-200' },
];

export default function Dashboard() {
  const { settings } = useSettings();
  const [range, setRange] = useState(initialRange('today'));
  const { data, loading, error, reload } = useApi('/dashboard', { from: range.from, to: range.to });

  const isToday = range.from === today() && range.to === today();
  const label = isToday ? "Today's" : range.preset === 'yesterday' ? "Yesterday's" : '';
  const p = data?.period;
  const s = data?.stock;

  const sendSummary = () => {
    const t = data.today;
    openWhatsApp(
      null,
      messages.summary(settings, {
        date: today(),
        given: t.given,
        returned: t.returned,
        cash: t.cash,
        udhari: t.udhari,
        payments: t.payments,
        pending: t.pending,
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-500">{fmtLongDate()}</p>
          <h1 className="text-xl font-bold">नमस्कार 🙏</h1>
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
          📱 WhatsApp – Send Today&apos;s Summary
        </button>
      </div>

      <RangeFilter value={range} onChange={setRange} />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}

      {data && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Jars right now</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Available Jars" value={s.available_jars} icon="✅" tone="green" to="/jars" />
              <StatCard label="With Customers" value={s.customer_jars} icon="🏠" tone="blue" to="/reports/jar-status" />
              <StatCard label="Total Jars" value={s.total_jars} icon="💧" tone="slate" to="/jars" />
              <StatCard label="Damaged / Lost" value={s.damaged_jars + s.lost_jars} icon="⚠️" tone="red" to="/jars" sub={`${s.damaged_jars} damaged · ${s.lost_jars} lost`} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{label || 'Period'} business</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={`${label} Jars Given`.trim()} value={p.given} icon="📤" tone="blue" />
              <StatCard label={`${label} Jars Returned`.trim()} value={p.returned} icon="📥" tone="purple" />
              <StatCard label={`${label} Cash`.trim()} value={money(p.cash)} icon="💵" tone="green" sub={p.payments_upi + p.payments_bank > 0 ? `+ ${money(p.payments_upi + p.payments_bank)} UPI/Bank` : null} />
              <StatCard label={`${label} Udhari`.trim()} value={money(p.udhari)} icon="📒" tone="amber" />
              <StatCard label="Payments Received" value={money(p.payments)} icon="🧾" tone="green" to="/payments" />
              <StatCard label="Total Pending" value={money(p.pending)} icon="⏳" tone="red" to="/reports/pending" sub="कोणाकडून पैसे घ्यायचे" />
              <StatCard label={`${label} Expenses`.trim()} value={money(p.expenses)} icon="🧾" tone="slate" to="/expenses" sub={`This month: ${money(data.month_expenses)}`} />
              <StatCard label="Net Cash" value={money(p.net_cash)} icon="💰" tone={p.net_cash >= 0 ? 'green' : 'red'} sub="Cash − cash expenses" />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label || 'Period'} transactions</h2>
              <Link to="/transactions" className="text-sm font-semibold text-brand-700">
                All entries ›
              </Link>
            </div>
            {data.customers.length === 0 ? (
              <Empty>No jar entries for this period.</Empty>
            ) : (
              <div className="space-y-3">
                {data.customers.map((c) => (
                  <Link key={c.customer_id} to={`/customers/${c.customer_id}`} className="card block active:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-sm text-slate-500">
                        Now holds <b className="text-slate-800">{c.current_jars}</b> jars
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                      <Mini label="Given" value={c.given} />
                      <Mini label="Returned" value={c.returned} />
                      <Mini label="Net Jars" value={c.net_jars} />
                      <Mini label="Amount" value={money(c.amount)} />
                      <Mini label="Paid" value={money(c.paid + c.payments)} tone="text-emerald-700" />
                      <Mini label="Udhari" value={money(c.udhari)} tone="text-amber-700" />
                    </div>
                    <div className="mt-2 text-right text-sm text-slate-500">
                      Total pending: <PendingText amount={c.pending_amount} />
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
