import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ExportBar from '../components/ExportBar';
import LedgerTable from '../components/LedgerTable';
import { Empty, ErrorBox, Loader, PageHeader, PendingText, PrintHeader } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { exportExcel } from '../lib/export';
import { fmtDate, money } from '../lib/format';
import { useApi } from '../lib/useApi';
import { ledgerText, openWhatsApp } from '../lib/whatsapp';

export default function Ledger() {
  const { id } = useParams();
  const { settings } = useSettings();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, loading, error, reload } = useApi(`/customers/${id}/ledger`, { from: from || undefined, to: to || undefined });

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loader />;

  const c = data.customer;
  const rows = data.rows;
  const period = from || to ? `${from ? fmtDate(from) : 'Start'} – ${to ? fmtDate(to) : 'Today'}` : 'All entries';

  const excel = () =>
    exportExcel(
      `Ledger-${c.name}`,
      'Ledger',
      [
        { label: 'Date', value: (r) => fmtDate(r.entry_date) },
        { label: 'Type', key: 'entry_type' },
        { label: 'Given', key: 'jars_given' },
        { label: 'Returned', key: 'jars_returned' },
        { label: 'Net Jar', key: 'net_jars' },
        { label: 'Amount', key: 'amount' },
        { label: 'Paid', key: 'paid' },
        { label: 'Udhari', key: 'udhari' },
        { label: 'Balance', key: 'balance' },
        { label: 'Jars With Customer', key: 'jar_balance' },
      ],
      rows,
      [settings.business_name || 'Sai Water Suppliers', `Customer Ledger: ${c.name} (${c.mobile})`, period, `Current Jars: ${c.current_jars}   Total Pending: ${c.pending_amount}`]
    );

  return (
    <div className="space-y-4">
      <PageHeader title="Customer Ledger" subtitle={c.name} back />
      <PrintHeader settings={settings} title={`Customer Ledger – ${c.name} (${c.mobile})`} subtitle={period} />

      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-sm text-slate-500">Current Jars</div>
          <div className="text-3xl font-bold text-brand-800">{c.current_jars}</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-slate-500">Total Pending</div>
          <PendingText amount={c.pending_amount} className="text-3xl font-bold" />
        </div>
      </div>

      <div className="no-print grid grid-cols-2 gap-2">
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>

      <ExportBar
        onExcel={excel}
        extra={
          <button className="btn-wa btn-sm shrink-0" onClick={() => openWhatsApp(c.mobile, ledgerText(settings, c, rows))}>
            💬 Send WhatsApp
          </button>
        }
      />

      <div className="card">
        {from && (
          <p className="mb-2 text-sm text-slate-600">
            Opening balance: <b>{money(data.opening.balance)}</b> · Opening jars: <b>{data.opening.jar_balance}</b>
          </p>
        )}
        {loading ? <Loader /> : rows.length === 0 ? <Empty>No entries in this period.</Empty> : <LedgerTable rows={rows} />}
      </div>
    </div>
  );
}
