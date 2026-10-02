import { useState } from 'react';
import ExportBar from '../../components/ExportBar';
import RangeFilter, { initialRange } from '../../components/RangeFilter';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { lang, t } from '../../i18n';
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
    { label: t('rep.col.customer'), key: 'name' },
    { label: t('rep.col.mobile'), key: 'mobile' },
    { label: t('rep.udhari.given'), key: 'udhari' },
    { label: t('rep.udhari.col.recovered'), key: 'payments' },
    { label: t('rep.udhari.pendingNow'), key: 'pending_amount' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t('rep.udhari.title')} subtitle={period} back="/reports" />
      <PrintHeader settings={settings} title={t('rep.udhari.title')} subtitle={period} />
      <RangeFilter value={range} onChange={setRange} />
      <ReportFilters customerId={customerId} onCustomer={setCustomerId} search={search} onSearch={setSearch} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {s && (
        <>
          <ExportBar onExcel={() => exportExcel(`${t('rep.udhari.file')}-${range.from}`, t('rep.udhari.sheet'), cols, rows, [(lang === 'en' ? settings.business_name || 'Sai Water Suppliers' : settings.business_name_mr || 'साई वॉटर सप्लायर्स'), t('rep.udhari.titleLine', { period })])} />
          <div className="grid grid-cols-3 gap-2">
            <StatCard label={t('rep.udhari.given')} value={money(s.udhari)} tone="amber" />
            <StatCard label={t('rep.udhari.recovered')} value={money(s.payments)} tone="green" />
            <StatCard label={t('rep.udhari.pendingNow')} value={money(s.pending)} tone="red" />
          </div>
          <section className="card">
            {rows.length === 0 ? (
              <Empty>{t('rep.udhari.empty')}</Empty>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t('rep.col.customer')}</th>
                      <th className="num">{t('rep.udhari.given')}</th>
                      <th className="num">{t('rep.udhari.paidBack')}</th>
                      <th className="num">{t('rep.udhari.pendingNow')}</th>
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
