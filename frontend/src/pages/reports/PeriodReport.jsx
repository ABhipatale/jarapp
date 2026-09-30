import { useState } from 'react';
import ExportBar from '../../components/ExportBar';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { exportExcel } from '../../lib/export';
import { addDays, fmtDate, money, today } from '../../lib/format';
import { useApi, useDebounced } from '../../lib/useApi';
import { messages, openWhatsApp } from '../../lib/whatsapp';
import ReportFilters from './ReportFilters';

const TITLES = { daily: 'Daily Report', weekly: 'Weekly Report', monthly: 'Monthly Report' };

/** Daily / Weekly / Monthly report: totals + customer-wise table. */
export default function PeriodReport({ kind }) {
  const { settings } = useSettings();
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);

  const params = { customer_id: customerId || undefined, search: q || undefined, ...(kind === 'monthly' ? { month } : { date }) };
  const { data, loading, error, reload } = useApi(`/reports/${kind}`, params);
  const s = data?.summary;
  const rows = data?.customers || [];
  const period = data ? (data.from === data.to ? fmtDate(data.from) : `${fmtDate(data.from)} – ${fmtDate(data.to)}`) : '';

  const excel = () =>
    exportExcel(
      `${TITLES[kind].replace(' ', '-')}-${data.from}`,
      TITLES[kind],
      [
        { label: 'Customer', key: 'name' },
        { label: 'Mobile', key: 'mobile' },
        { label: 'Given', key: 'given' },
        { label: 'Returned', key: 'returned' },
        { label: 'Current Jars', key: 'current_jars' },
        { label: 'Amount', key: 'amount' },
        { label: 'Paid', key: 'paid' },
        { label: 'Udhari', key: 'udhari' },
        { label: 'Payments', key: 'payments' },
        { label: 'Pending', key: 'pending_amount' },
      ],
      rows,
      [
        settings.business_name || 'Sai Water Suppliers',
        `${TITLES[kind]}: ${period}`,
        `Given ${s.given} | Returned ${s.returned} | Sales ${s.sales} | Cash ${s.cash} | Udhari ${s.udhari} | Payments ${s.payments} | Pending ${s.pending}`,
      ]
    );

  const step = (dir) => setDate(addDays(date, dir * (kind === 'weekly' ? 7 : 1)));

  return (
    <div className="space-y-4">
      <PageHeader title={TITLES[kind]} subtitle={period} back="/reports" />
      <PrintHeader settings={settings} title={TITLES[kind]} subtitle={period} />

      <ReportFilters customerId={customerId} onCustomer={setCustomerId} search={search} onSearch={setSearch}>
        {kind === 'monthly' ? (
          <input type="month" className="input" value={month} max={today().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} />
        ) : (
          <div className="flex gap-2">
            <button className="btn-light w-12" onClick={() => step(-1)} aria-label="Previous">‹</button>
            <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            <button className="btn-light w-12" onClick={() => step(1)} disabled={date >= today()} aria-label="Next">›</button>
          </div>
        )}
      </ReportFilters>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}

      {s && (
        <>
          <ExportBar
            onExcel={excel}
            extra={
              kind === 'daily' && !customerId ? (
                <button
                  className="btn-wa btn-sm shrink-0"
                  onClick={() => openWhatsApp(null, messages.summary(settings, { date: data.from, given: s.given, returned: s.returned, cash: s.cash, udhari: s.udhari, payments: s.payments, pending: s.pending }))}
                >
                  💬 WhatsApp Summary
                </button>
              ) : null
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <StatCard label={kind === 'monthly' ? 'Jars Delivered' : 'Jars Given'} value={s.given} tone="blue" />
            <StatCard label="Jars Returned" value={s.returned} tone="purple" />
            {kind === 'daily' ? <StatCard label="Net Jars Given" value={s.net_jars} tone="slate" /> : <StatCard label="Total Sales" value={money(s.sales)} tone="slate" />}
            <StatCard label={kind === 'monthly' ? 'Cash Received' : 'Cash Collection'} value={money(s.cash)} tone="green" />
            <StatCard label="Udhari" value={money(s.udhari)} tone="amber" />
            <StatCard label="Payments Received" value={money(s.payments)} tone="green" sub={`UPI ${money(s.payments_upi)} · Bank ${money(s.payments_bank)}`} />
            <StatCard label={kind === 'monthly' ? 'Pending Payments' : 'Pending Amount'} value={money(s.pending)} tone="red" sub="All-time, as of now" />
            {kind === 'daily' && <StatCard label="Total Sales" value={money(s.sales)} tone="slate" />}
            {kind === 'weekly' && <StatCard label="Expenses" value={money(s.expenses)} tone="slate" />}
            {kind === 'monthly' && (
              <>
                <StatCard label="Damaged Jars" value={s.damaged} tone="red" />
                <StatCard label="Lost Jars" value={s.lost} tone="amber" />
                <StatCard label="Expenses" value={money(s.expenses)} tone="slate" />
                <StatCard label="Net Cash" value={money(s.net_cash)} tone="green" />
              </>
            )}
          </div>

          <section className="card">
            <h2 className="mb-2 font-semibold">Customer-wise</h2>
            {rows.length === 0 ? (
              <Empty>No customer activity.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th className="num">Given</th>
                      <th className="num">Returned</th>
                      <th className="num">Current Jars</th>
                      <th className="num">Amount</th>
                      <th className="num">Paid</th>
                      <th className="num">Udhari</th>
                      <th className="num">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.customer_id}>
                        <td className="font-medium">{r.name}</td>
                        <td className="num">{r.given}</td>
                        <td className="num">{r.returned}</td>
                        <td className="num font-semibold">{r.current_jars}</td>
                        <td className="num">{money(r.amount)}</td>
                        <td className="num text-emerald-700">{money(r.paid + r.payments)}</td>
                        <td className="num text-amber-700">{money(r.udhari)}</td>
                        <td className="num"><PendingText amount={r.pending_amount} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className="px-2.5 py-2">Total</td>
                      <td className="num px-2.5">{rows.reduce((a, r) => a + r.given, 0)}</td>
                      <td className="num px-2.5">{rows.reduce((a, r) => a + r.returned, 0)}</td>
                      <td className="num px-2.5">{rows.reduce((a, r) => a + r.current_jars, 0)}</td>
                      <td className="num px-2.5">{money(rows.reduce((a, r) => a + r.amount, 0))}</td>
                      <td className="num px-2.5">{money(rows.reduce((a, r) => a + r.paid + r.payments, 0))}</td>
                      <td className="num px-2.5">{money(rows.reduce((a, r) => a + r.udhari, 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
