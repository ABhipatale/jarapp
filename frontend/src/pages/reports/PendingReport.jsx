import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExportBar from '../../components/ExportBar';
import { Empty, ErrorBox, Loader, PageHeader, PrintHeader } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { exportExcel } from '../../lib/export';
import { fmtDate, money, today } from '../../lib/format';
import { useApi, useDebounced } from '../../lib/useApi';
import { messages, openWhatsApp } from '../../lib/whatsapp';
import ReportFilters from './ReportFilters';

/** कोणाकडून पैसे घ्यायचे आहेत? — customers with pending, biggest first. */
export default function PendingReport() {
  const { settings } = useSettings();
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi('/reports/pending', { customer_id: customerId || undefined, search: q || undefined });
  const rows = data?.customers || [];

  const cols = [
    { label: 'Customer', key: 'name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Current Jars', key: 'current_jars' },
    { label: 'Pending', key: 'pending_amount' },
    { label: 'Last Payment', value: (r) => (r.last_payment_date ? fmtDate(r.last_payment_date) : '') },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Pending Payments" subtitle="कोणाकडून पैसे घ्यायचे आहेत?" back="/reports" />
      <PrintHeader settings={settings} title="Pending Payment Report" subtitle={`As on ${fmtDate(today())}`} />
      <ReportFilters customerId={customerId} onCustomer={setCustomerId} search={search} onSearch={setSearch} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {data && (
        <>
          <ExportBar onExcel={() => exportExcel(`Pending-${today()}`, 'Pending', cols, rows, [settings.business_name, `Pending Payments as on ${fmtDate(today())}`, `Total: ${data.total}`])} />
          <div className="card flex items-center justify-between bg-red-50 !ring-red-200">
            <span className="font-medium text-red-800">Total Pending ({rows.length} customers)</span>
            <span className="text-2xl font-bold text-red-700">{money(data.total)}</span>
          </div>
          {rows.length === 0 && <Empty>🎉 No pending payments.</Empty>}
          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.customer_id} className="card !py-3">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/customers/${r.customer_id}`} className="min-w-0">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-sm text-slate-500">
                      {r.mobile} · 💧 {r.current_jars} jars
                    </div>
                    <div className="text-xs text-slate-400">Last payment: {r.last_payment_date ? fmtDate(r.last_payment_date) : 'never'}</div>
                  </Link>
                  <div className="text-xl font-bold text-red-600">{money(r.pending_amount)}</div>
                </div>
                <div className="no-print mt-2 grid grid-cols-2 gap-2">
                  <button className="btn-wa btn-sm" onClick={() => openWhatsApp(r.mobile, messages.reminder(settings, r))}>
                    🔔 Send Udhari Reminder
                  </button>
                  <Link to={`/payments/new?customer=${r.customer_id}`} className="btn-light btn-sm">
                    💰 Receive
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
