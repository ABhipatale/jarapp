import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ExportBar from '../components/ExportBar';
import EditEntryModal from '../components/EditEntryModal';
import LedgerTable from '../components/LedgerTable';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { t } from '../i18n';
import { exportExcel } from '../lib/export';
import { businessName, fmtDate, money } from '../lib/format';
import { useApi } from '../lib/useApi';
import { ledgerText, openWhatsApp } from '../lib/whatsapp';

export default function Ledger() {
  const { id } = useParams();
  const { settings } = useSettings();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, loading, error, reload } = useApi(`/customers/${id}/ledger`, { from: from || undefined, to: to || undefined });
  const [editing, setEditing] = useState(null);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loader />;

  const c = data.customer;
  const rows = data.rows;
  const period = from || to ? `${from ? fmtDate(from) : t('ledger.start')} – ${to ? fmtDate(to) : t('ledger.today')}` : t('ledger.allEntries');

  const excel = () =>
    exportExcel(
      t('ledger.fileName', { name: c.name }),
      t('ledger.sheet'),
      [
        { label: t('ledger.date'), value: (r) => fmtDate(r.entry_date) },
        { label: t('ledger.type'), value: (r) => ({ given: t('ledger.typeGiven'), returned: t('ledger.typeReturned'), payment: t('ledger.typePayment') })[r.entry_type] || r.entry_type },
        { label: t('ledger.given'), key: 'jars_given' },
        { label: t('ledger.returned'), key: 'jars_returned' },
        { label: t('ledger.netJar'), key: 'net_jars' },
        { label: t('ledger.amount'), key: 'amount' },
        { label: t('ledger.paid'), key: 'paid' },
        { label: t('ledger.udhari'), key: 'udhari' },
        { label: t('ledger.balance'), key: 'balance' },
        { label: t('ledger.jarsWithCustomer'), key: 'jar_balance' },
      ],
      rows,
      [businessName(settings), t('ledger.excelTitle', { name: c.name, mobile: c.mobile }), period, t('ledger.excelSummary', { jars: c.current_jars, pending: c.pending_amount })]
    );

  return (
    <div className="space-y-4">
      <PageHeader title={t('ledger.title')} subtitle={c.name} back />
      <PrintHeader settings={settings} title={t('ledger.printTitle', { name: c.name, mobile: c.mobile })} subtitle={period} />

      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-sm text-slate-500">{t('common.currentJars')}</div>
          <div className="text-3xl font-bold text-brand-800">{c.current_jars}</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-slate-500">{t('common.totalPending')}</div>
          <PendingText amount={c.pending_amount} className="text-3xl font-bold" />
        </div>
      </div>

      <div className="no-print grid grid-cols-2 gap-2">
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('ledger.fromDate')} />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('ledger.toDate')} />
      </div>

      <ExportBar
        onExcel={excel}
        extra={
          <button className="btn-wa btn-sm shrink-0" onClick={() => openWhatsApp(c.mobile, ledgerText(settings, c, rows))}>
            💬 {t('ledger.sendWhatsApp')}
          </button>
        }
      />

      <div className="card">
        {from && (
          <p className="mb-2 text-sm text-slate-600">
            {t('ledger.openingBalance')} <b>{money(data.opening.balance)}</b> · {t('ledger.openingJars')} <b>{data.opening.jar_balance}</b>
          </p>
        )}
        {loading ? <Loader /> : rows.length === 0 ? <Empty>{t('ledger.noEntries')}</Empty> : <LedgerTable rows={rows} onEdit={setEditing} />}
      </div>
      {editing && <EditEntryModal kind={editing.kind} id={editing.id} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}
