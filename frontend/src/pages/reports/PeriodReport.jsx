import { useState } from 'react';
import ExportBar from '../../components/ExportBar';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader, StatCard } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { lang, t } from '../../i18n';
import { exportExcel } from '../../lib/export';
import { addDays, fmtDate, money, today } from '../../lib/format';
import { useApi, useDebounced } from '../../lib/useApi';
import { messages, openWhatsApp } from '../../lib/whatsapp';
import ReportFilters from './ReportFilters';

const TITLES = { daily: t('rep.daily.title'), weekly: t('rep.weekly.title'), monthly: t('rep.monthly.title') };

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
        { label: t('rep.col.customer'), key: 'name' },
        { label: t('rep.col.mobile'), key: 'mobile' },
        { label: t('rep.col.given'), key: 'given' },
        { label: t('rep.col.returned'), key: 'returned' },
        { label: t('rep.col.currentJars'), key: 'current_jars' },
        { label: t('rep.col.amount'), key: 'amount' },
        { label: t('rep.col.paid'), key: 'paid' },
        { label: t('rep.col.udhari'), key: 'udhari' },
        { label: t('rep.col.payments'), key: 'payments' },
        { label: t('rep.col.pending'), key: 'pending_amount' },
      ],
      rows,
      [
        lang === 'en' ? settings.business_name || 'Sai Water Suppliers' : settings.business_name_mr || 'साई वॉटर सप्लायर्स',
        `${TITLES[kind]}: ${period}`,
        t('rep.period.excelSummary', { given: s.given, returned: s.returned, sales: s.sales, cash: s.cash, udhari: s.udhari, payments: s.payments, pending: s.pending }),
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
            <button className="btn-light w-12" onClick={() => step(-1)} aria-label={t('rep.prev')}>‹</button>
            <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            <button className="btn-light w-12" onClick={() => step(1)} disabled={date >= today()} aria-label={t('rep.next')}>›</button>
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
                  {t('rep.period.waSummary')}
                </button>
              ) : null
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <StatCard label={kind === 'monthly' ? t('rep.period.jarsDelivered') : t('rep.period.jarsGiven')} value={s.given} tone="blue" />
            <StatCard label={t('rep.period.jarsReturned')} value={s.returned} tone="purple" />
            {kind === 'daily' ? <StatCard label={t('rep.period.netJarsGiven')} value={s.net_jars} tone="slate" /> : <StatCard label={t('rep.period.totalSales')} value={money(s.sales)} tone="slate" />}
            <StatCard label={kind === 'monthly' ? t('rep.period.cashReceived') : t('rep.period.cashCollection')} value={money(s.cash)} tone="green" />
            <StatCard label={t('rep.period.udhari')} value={money(s.udhari)} tone="amber" />
            <StatCard label={t('rep.period.paymentsReceived')} value={money(s.payments)} tone="green" sub={t('rep.period.paymentsSub', { upi: money(s.payments_upi), bank: money(s.payments_bank) })} />
            <StatCard label={kind === 'monthly' ? t('rep.period.pendingPayments') : t('rep.period.pendingAmount')} value={money(s.pending)} tone="red" sub={t('rep.period.pendingSub')} />
            {kind === 'daily' && <StatCard label={t('rep.period.totalSales')} value={money(s.sales)} tone="slate" />}
            {kind === 'weekly' && <StatCard label={t('rep.period.expenses')} value={money(s.expenses)} tone="slate" />}
            {kind === 'monthly' && (
              <>
                <StatCard label={t('rep.period.damagedJars')} value={s.damaged} tone="red" />
                <StatCard label={t('rep.period.lostJars')} value={s.lost} tone="amber" />
                <StatCard label={t('rep.period.expenses')} value={money(s.expenses)} tone="slate" />
                <StatCard label={t('rep.period.netCash')} value={money(s.net_cash)} tone="green" />
              </>
            )}
          </div>

          <section className="card">
            <h2 className="mb-2 font-semibold">{t('rep.period.customerWise')}</h2>
            {rows.length === 0 ? (
              <Empty>{t('rep.period.empty')}</Empty>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t('rep.col.customer')}</th>
                      <th className="num">{t('rep.col.given')}</th>
                      <th className="num">{t('rep.col.returned')}</th>
                      <th className="num">{t('rep.col.currentJars')}</th>
                      <th className="num">{t('rep.col.amount')}</th>
                      <th className="num">{t('rep.col.paid')}</th>
                      <th className="num">{t('rep.col.udhari')}</th>
                      <th className="num">{t('rep.col.pending')}</th>
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
                      <td className="px-2.5 py-2">{t('rep.total')}</td>
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
