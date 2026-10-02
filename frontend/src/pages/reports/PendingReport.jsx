import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExportBar from '../../components/ExportBar';
import { Empty, ErrorBox, Loader, PageHeader, PrintHeader } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { lang, t } from '../../i18n';
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
    { label: t('rep.col.customer'), key: 'name' },
    { label: t('rep.col.mobile'), key: 'mobile' },
    { label: t('rep.col.currentJars'), key: 'current_jars' },
    { label: t('rep.col.pending'), key: 'pending_amount' },
    { label: t('rep.pending.lastPayment'), value: (r) => (r.last_payment_date ? fmtDate(r.last_payment_date) : '') },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t('rep.pending.title')} subtitle={t('rep.pending.sub')} back="/reports" />
      <PrintHeader settings={settings} title={t('rep.pending.cardTitle')} subtitle={t('rep.asOn', { date: fmtDate(today()) })} />
      <ReportFilters customerId={customerId} onCustomer={setCustomerId} search={search} onSearch={setSearch} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {data && (
        <>
          <ExportBar onExcel={() => exportExcel(`${t('rep.pending.file')}-${today()}`, t('rep.pending.sheet'), cols, rows, [(lang === 'en' ? settings.business_name || 'Sai Water Suppliers' : settings.business_name_mr || 'साई वॉटर सप्लायर्स'), t('rep.pending.titleLine', { date: fmtDate(today()) }), t('rep.pending.totalLine', { total: data.total })])} />
          <div className="card flex items-center justify-between bg-red-50 !ring-red-200">
            <span className="font-medium text-red-800">{t('rep.pending.totalPending', { n: rows.length })}</span>
            <span className="text-2xl font-bold text-red-700">{money(data.total)}</span>
          </div>
          {rows.length === 0 && <Empty>{t('rep.pending.empty')}</Empty>}
          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.customer_id} className="card !py-3">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/customers/${r.customer_id}`} className="min-w-0">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-sm text-slate-500">
                      {r.mobile} · 💧 {t('rep.pending.jars', { n: r.current_jars })}
                    </div>
                    <div className="text-xs text-slate-400">{t('rep.pending.lastPaymentLine', { date: r.last_payment_date ? fmtDate(r.last_payment_date) : t('rep.pending.never') })}</div>
                  </Link>
                  <div className="text-xl font-bold text-red-600">{money(r.pending_amount)}</div>
                </div>
                <div className="no-print mt-2 grid grid-cols-2 gap-2">
                  <button className="btn-wa btn-sm" onClick={() => openWhatsApp(r.mobile, messages.reminder(settings, r))}>
                    {t('rep.pending.sendReminder')}
                  </button>
                  <Link to={`/payments/new?customer=${r.customer_id}`} className="btn-light btn-sm">
                    {t('rep.pending.receive')}
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
