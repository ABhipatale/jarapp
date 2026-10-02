import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExportBar from '../../components/ExportBar';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { lang, t } from '../../i18n';
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
      <PageHeader title={t('rep.jarStatus.title')} subtitle={t('rep.jarStatus.sub')} back="/reports" />
      <PrintHeader settings={settings} title={t('rep.jarStatus.cardTitle')} subtitle={t('rep.asOn', { date: fmtDate(today()) })} />
      <ReportFilters customerId={customerId} onCustomer={setCustomerId} search={search} onSearch={setSearch} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {s && (
        <>
          <ExportBar
            onExcel={() =>
              exportExcel(
                `${t('rep.jarStatus.file')}-${today()}`,
                t('rep.jarStatus.sheet'),
                [
                  { label: t('rep.col.customer'), key: 'name' },
                  { label: t('rep.col.mobile'), key: 'mobile' },
                  { label: t('rep.jarStatus.col.withCustomer'), key: 'current_jars' },
                  { label: t('rep.col.pending'), key: 'pending_amount' },
                ],
                rows,
                [
                  lang === 'en' ? settings.business_name || 'Sai Water Suppliers' : settings.business_name_mr || 'साई वॉटर सप्लायर्स',
                  t('rep.jarStatus.titleLine', { date: fmtDate(today()) }),
                  t('rep.jarStatus.summaryLine', { total: s.total_jars, available: s.available_jars, customers: s.customer_jars, damaged: s.damaged_jars, lost: s.lost_jars }),
                ]
              )
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t('rep.jarStatus.available')} value={s.available_jars} tone="green" />
            <StatCard label={t('rep.jarStatus.withCustomers')} value={s.customer_jars} tone="blue" />
            <StatCard label={t('rep.jarStatus.total')} value={s.total_jars} tone="slate" />
            <StatCard label={t('rep.jarStatus.damagedLost')} value={`${s.damaged_jars} / ${s.lost_jars}`} tone="red" />
          </div>
          <section className="card">
            {rows.length === 0 ? (
              <Empty>{t('rep.jarStatus.empty')}</Empty>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t('rep.col.customer')}</th>
                      <th>{t('rep.col.mobile')}</th>
                      <th className="num">{t('rep.col.jars')}</th>
                      <th className="num">{t('rep.col.pending')}</th>
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
