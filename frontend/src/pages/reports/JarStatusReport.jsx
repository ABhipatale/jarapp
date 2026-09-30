import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExportBar from '../../components/ExportBar';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { exportExcel } from '../../lib/export';
import { fmtDate, today } from '../../lib/format';
import { useApi, useDebounced } from '../../lib/useApi';
import ReportFilters from './ReportFilters';

/** कोणाकडे किती जार आहेत? */
export default function JarStatusReport() {
  const { settings } = useSettings();
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi('/reports/jar-status', { customer_id: customerId || undefined, search: q || undefined });
  const s = data?.summary;
  const rows = data?.customers || [];

  return (
    <div className="space-y-4">
      <PageHeader title="Jar Status" subtitle="कोणाकडे किती जार आहेत?" back="/reports" />
      <PrintHeader settings={settings} title="Jar Status Report" subtitle={`As on ${fmtDate(today())}`} />
      <ReportFilters customerId={customerId} onCustomer={setCustomerId} search={search} onSearch={setSearch} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {s && (
        <>
          <ExportBar
            onExcel={() =>
              exportExcel(
                `Jar-Status-${today()}`,
                'Jar Status',
                [
                  { label: 'Customer', key: 'name' },
                  { label: 'Mobile', key: 'mobile' },
                  { label: 'Jars With Customer', key: 'current_jars' },
                  { label: 'Pending', key: 'pending_amount' },
                ],
                rows,
                [settings.business_name, `Jar Status as on ${fmtDate(today())}`, `Total ${s.total_jars} | Available ${s.available_jars} | With customers ${s.customer_jars} | Damaged ${s.damaged_jars} | Lost ${s.lost_jars}`]
              )
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Available" value={s.available_jars} tone="green" />
            <StatCard label="With Customers" value={s.customer_jars} tone="blue" />
            <StatCard label="Total" value={s.total_jars} tone="slate" />
            <StatCard label="Damaged / Lost" value={`${s.damaged_jars} / ${s.lost_jars}`} tone="red" />
          </div>
          <section className="card">
            {rows.length === 0 ? (
              <Empty>No jars with customers.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Mobile</th>
                      <th className="num">Jars</th>
                      <th className="num">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.customer_id}>
                        <td className="font-medium">
                          <Link to={`/customers/${r.customer_id}`}>{r.name}</Link>
                        </td>
                        <td>{r.mobile}</td>
                        <td className="num text-lg font-bold text-brand-800">{r.current_jars}</td>
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
