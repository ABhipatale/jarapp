import { useState } from 'react';
import ExportBar from '../../components/ExportBar';
import RangeFilter, { initialRange } from '../../components/RangeFilter';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { exportExcel } from '../../lib/export';
import { fmtDate, money } from '../../lib/format';
import { useApi, useDebounced } from '../../lib/useApi';
import ReportFilters from './ReportFilters';

export default function UdhariReport() {
  const { settings } = useSettings();
  const [range, setRange] = useState(initialRange('month'));
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi('/reports/udhari', { from: range.from, to: range.to, customer_id: customerId || undefined, search: q || undefined });
  const s = data?.summary;
  const rows = data?.customers || [];
  const period = `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  const cols = [
    { label: 'Customer', key: 'name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Udhari Given', key: 'udhari' },
    { label: 'Payments Received', key: 'payments' },
    { label: 'Pending Now', key: 'pending_amount' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Udhari Report" subtitle={period} back="/reports" />
      <PrintHeader settings={settings} title="Udhari Report" subtitle={period} />
      <RangeFilter value={range} onChange={setRange} />
      <ReportFilters customerId={customerId} onCustomer={setCustomerId} search={search} onSearch={setSearch} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {s && (
        <>
          <ExportBar onExcel={() => exportExcel(`Udhari-Report-${range.from}`, 'Udhari', cols, rows, [settings.business_name, `Udhari Report: ${period}`])} />
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Udhari Given" value={money(s.udhari)} tone="amber" />
            <StatCard label="Recovered" value={money(s.payments)} tone="green" />
            <StatCard label="Pending Now" value={money(s.pending)} tone="red" />
          </div>
          <section className="card">
            {rows.length === 0 ? (
              <Empty>No udhari in this period.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th className="num">Udhari Given</th>
                      <th className="num">Paid Back</th>
                      <th className="num">Pending Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.customer_id}>
                        <td className="font-medium">{r.name}</td>
                        <td className="num text-amber-700">{money(r.udhari)}</td>
                        <td className="num text-emerald-700">{money(r.payments)}</td>
                        <td className="num"><PendingText amount={r.pending_amount} /></td>
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
