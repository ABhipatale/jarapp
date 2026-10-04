import { useState } from 'react';
import api, { errorMessage } from '../api/client';
import EditEntryModal from '../components/EditEntryModal';
import RangeFilter, { initialRange } from '../components/RangeFilter';
import { Badge, Empty, ErrorBox, Fab, Loader, PageHeader } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { fmtDate, money } from '../lib/format';
import { useApi, useDebounced } from '../lib/useApi';
import { messages, openWhatsApp } from '../lib/whatsapp';

export default function Payments() {
  const { settings } = useSettings();
  const { toast, confirm } = useUi();
  const [range, setRange] = useState(initialRange('month'));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const [editId, setEditId] = useState(null);
  const { data, loading, error, reload } = useApi('/payments', { from: range.from, to: range.to, search: q, page });
  const list = data?.data || [];
  const total = list.reduce((s, p) => s + p.amount, 0);

  const remove = async (p) => {
    if (!(await confirm({ message: t('payments.confirmDelete', { name: p.customer_name, amount: money(p.amount) }) }))) return;
    try {
      await api.delete(`/payments/${p.id}`);
      toast(t('payments.deleted'));
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader title={t('payments.title')} subtitle={t('payments.subtitle')} />
      <RangeFilter value={range} onChange={(r) => { setRange(r); setPage(1); }} />
      <input className="input" type="search" placeholder={t('entry.searchCustomer')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {data && (
        <p className="text-sm text-slate-600">
          {t('payments.count', { n: data.total })}{data.last_page === 1 && <> · {t('payments.total')} <b>{money(total)}</b></>}
        </p>
      )}
      {data && list.length === 0 && <Empty>{t('payments.empty')}</Empty>}

      <div className="space-y-2.5">
        {list.map((p) => (
          <div key={p.id} className="card !py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.customer_name}</div>
                <div className="text-sm text-slate-500">
                  {fmtDate(p.payment_date)} · <Badge kind={p.payment_mode}>{{ cash: t('entry.modeCash'), upi: 'UPI', bank: t('entry.modeBank') }[p.payment_mode] || p.payment_mode.toUpperCase()}</Badge> {p.is_advance && <Badge kind="advance">{t('entry.advance')}</Badge>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-700">{money(p.amount)}</div>
                <div className="text-xs text-slate-500">
                  {money(p.previous_pending)} → {money(p.remaining_pending)}
                </div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button className="btn-wa btn-sm flex-1" onClick={() => openWhatsApp(p.customer_mobile, messages.payment(settings, p))}>
                {t('payments.receipt')}
              </button>
              <button className="btn-light btn-sm" onClick={() => setEditId(p.id)} aria-label={t('edit.button')}>
                ✏️
              </button>
              <button className="btn-light btn-sm text-red-600" onClick={() => remove(p)} aria-label={t('entry.delete')}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between">
          <button className="btn-light btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('entry.newer')}</button>
          <span className="text-sm text-slate-500">{t('entry.pageOf', { page, last: data.last_page })}</span>
          <button className="btn-light btn-sm" disabled={page >= data.last_page} onClick={() => setPage(page + 1)}>{t('entry.older')}</button>
        </div>
      )}

      <Fab to="/payments/new" label={t('payments.receive')} />
      {editId && <EditEntryModal kind="payment" id={editId} onClose={() => setEditId(null)} onSaved={reload} />}
    </div>
  );
}
