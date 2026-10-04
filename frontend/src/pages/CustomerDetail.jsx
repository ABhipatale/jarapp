import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import EditEntryModal from '../components/EditEntryModal';
import LedgerTable from '../components/LedgerTable';
import { Badge, Empty, ErrorBox, Loader, PageHeader } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { fmtDate, money } from '../lib/format';
import { useApi } from '../lib/useApi';
import { messages, openWhatsApp } from '../lib/whatsapp';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { toast, confirm } = useUi();
  const { data, loading, error, reload } = useApi(`/customers/${id}/ledger`);
  const [editing, setEditing] = useState(null);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Loader />;

  const c = data.customer;
  const rows = [...data.rows].reverse().slice(0, 50);

  const remove = async () => {
    if (!(await confirm({ message: t('cust.deleteConfirm', { name: c.name }) }))) return;
    try {
      await api.delete(`/customers/${c.id}`);
      toast(t('cust.deleted'));
      navigate('/customers', { replace: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const actions = [
    { label: t('common.giveJar'), icon: '＋', to: `/entry?type=given&customer=${c.id}`, cls: 'bg-brand-700 text-white' },
    { label: t('common.returnJar'), icon: '↩', to: `/entry?type=returned&customer=${c.id}`, cls: 'bg-sky-600 text-white' },
    { label: t('common.receivePayment'), icon: '💰', to: `/payments/new?customer=${c.id}`, cls: 'bg-emerald-600 text-white' },
    { label: t('cust.viewLedger'), icon: '📒', to: `/customers/${c.id}/ledger`, cls: 'bg-white ring-1 ring-slate-200' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={c.name}
        back="/customers"
        right={
          <Link to={`/customers/${c.id}/edit`} className="btn-light btn-sm">
            ✏️ {t('common.edit')}
          </Link>
        }
      />

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5 text-slate-700">
            <div>📱 {c.mobile}</div>
            {c.address && <div className="text-sm">📍 {c.address}</div>}
            <div className="text-xs text-slate-500">{t('cust.since', { date: fmtDate(c.created_at) })}</div>
          </div>
          <Badge kind={c.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-brand-50 p-3 text-center">
            <div className="text-sm text-brand-800">{t('common.currentJars')}</div>
            <div className="text-3xl font-bold text-brand-800">{c.current_jars}</div>
          </div>
          <div className={`rounded-2xl p-3 text-center ${c.pending_amount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            <div className="text-sm">{c.pending_amount < 0 ? t('cust.advance') : t('cust.pendingAmount')}</div>
            <div className="text-3xl font-bold">{money(Math.abs(c.pending_amount))}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`tel:${c.mobile}`} className="btn-light btn-sm">📞 {t('cust.call')}</a>
          <button className="btn-wa btn-sm" onClick={() => openWhatsApp(c.mobile, `नमस्कार ${c.name},\n\n`)}>
            💬 WhatsApp
          </button>
          {c.pending_amount > 0 && (
            <button className="btn-wa btn-sm col-span-2" onClick={() => openWhatsApp(c.mobile, messages.reminder(settings, c))}>
              🔔 {t('cust.sendReminder', { amount: money(c.pending_amount) })}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Link key={a.label} to={a.to} className={`flex items-center gap-2 rounded-2xl px-4 py-3.5 font-semibold shadow-sm active:scale-[.98] ${a.cls}`}>
            <span className="text-xl leading-none">{a.icon}</span> {a.label}
          </Link>
        ))}
      </div>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{t('cust.history')}</h2>
          <Link to={`/customers/${c.id}/ledger`} className="text-sm font-semibold text-brand-700">
            {t('cust.fullLedger')} ›
          </Link>
        </div>
        {rows.length === 0 ? <Empty>{t('cust.noEntries')}</Empty> : <LedgerTable rows={rows} onEdit={setEditing} />}
      </section>

      <button className="w-full py-3 text-sm font-semibold text-red-600" onClick={remove}>
        🗑 {t('cust.delete')}
      </button>
      {editing && <EditEntryModal kind={editing.kind} id={editing.id} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}
