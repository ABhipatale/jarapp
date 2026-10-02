import { useState } from 'react';
import ExportBar from '../../components/ExportBar';
import RangeFilter, { initialRange } from '../../components/RangeFilter';
import { Empty, ErrorBox, Loader, PageHeader, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { lang, t } from '../../i18n';
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
    { label: t('rep.cash.col.date'), value: (r) => fmtDate(r.date) },
    { label: t('rep.cash.col.entryCash'), key: 'entry_cash' },
    { label: t('rep.cash.col.paymentsCash'), key: 'payments_cash' },
    { label: t('rep.cash.col.totalCash'), key: 'cash' },
    { label: 'UPI', key: 'upi' },
    { label: t('rep.cash.col.bank'), key: 'bank' },
    { label: t('rep.cash.col.expenses'), key: 'expenses' },
    { label: t('rep.cash.col.netCash'), key: 'net_cash' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t('rep.cash.title')} subtitle={period} back="/reports" />
      <PrintHeader settings={settings} title={t('rep.cash.title')} subtitle={period} />
      <RangeFilter value={range} onChange={setRange} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {s && (
        <>
          <ExportBar onExcel={() => exportExcel(`${t('rep.cash.file')}-${range.from}`, t('rep.cash.sheet'), cols, data.days, [(lang === 'en' ? settings.business_name || 'Sai Water Suppliers' : settings.business_name_mr || 'साई वॉटर सप्लायर्स'), t('rep.cash.titleLine', { period })])} />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t('rep.cash.cashCollection')} value={money(s.cash)} tone="green" />
            <StatCard label={t('rep.cash.upiBank')} value={money(s.payments_upi + s.payments_bank)} tone="purple" />
            <StatCard label={t('rep.cash.expenses')} value={money(s.expenses)} tone="red" />
            <StatCard label={t('rep.cash.netCash')} value={money(s.net_cash)} tone="blue" />
          </div>
          <section className="card">
            {data.days.length === 0 ? (
              <Empty>{t('rep.cash.empty')}</Empty>
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
