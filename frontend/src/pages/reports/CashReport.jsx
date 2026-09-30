import { useState } from 'react';
import ExportBar from '../../components/ExportBar';
import RangeFilter, { initialRange } from '../../components/RangeFilter';
import { Empty, ErrorBox, Loader, PageHeader, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { exportExcel } from '../../lib/export';
import { fmtDate, money } from '../../lib/format';
import { useApi } from '../../lib/useApi';

export default function CashReport() {
  const { settings } = useSettings();
  const [range, setRange] = useState(initialRange('month'));
  const { data, loading, error, reload } = useApi('/reports/cash', { from: range.from, to: range.to });
  const s = data?.summary;
  const period = `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  const cols = [
    { label: 'Date', value: (r) => fmtDate(r.date) },
    { label: 'Jar Entry Cash', key: 'entry_cash' },
    { label: 'Cash Payments', key: 'payments_cash' },
    { label: 'Total Cash', key: 'cash' },
    { label: 'UPI', key: 'upi' },
    { label: 'Bank', key: 'bank' },
    { label: 'Cash Expenses', key: 'expenses' },
    { label: 'Net Cash', key: 'net_cash' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Cash Report" subtitle={period} back="/reports" />
      <PrintHeader settings={settings} title="Cash Report" subtitle={period} />
      <RangeFilter value={range} onChange={setRange} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {s && (
        <>
          <ExportBar onExcel={() => exportExcel(`Cash-Report-${range.from}`, 'Cash', cols, data.days, [settings.business_name, `Cash Report: ${period}`])} />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Cash Collection" value={money(s.cash)} tone="green" />
            <StatCard label="UPI + Bank" value={money(s.payments_upi + s.payments_bank)} tone="purple" />
            <StatCard label="Expenses" value={money(s.expenses)} tone="red" />
            <StatCard label="Net Cash" value={money(s.net_cash)} tone="blue" />
          </div>
          <section className="card">
            {data.days.length === 0 ? (
              <Empty>No cash movement in this period.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      {cols.map((c) => (
                        <th key={c.label} className={c.key ? 'num' : ''}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.map((d) => (
                      <tr key={d.date}>
                        <td>{fmtDate(d.date)}</td>
                        <td className="num">{money(d.entry_cash)}</td>
                        <td className="num">{money(d.payments_cash)}</td>
                        <td className="num font-semibold text-emerald-700">{money(d.cash)}</td>
                        <td className="num">{money(d.upi)}</td>
                        <td className="num">{money(d.bank)}</td>
                        <td className="num text-red-600">{money(d.expenses)}</td>
                        <td className="num font-bold">{money(d.net_cash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
