import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import RangeFilter, { initialRange } from '../components/RangeFilter';
import { Badge, Empty, ErrorBox, Fab, Loader, PageHeader } from '../components/ui';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { fmtDate, money } from '../lib/format';
import { useApi, useDebounced } from '../lib/useApi';

/** Search jar entries by customer, date and type; delete with confirmation. */
export default function Transactions() {
  const { toast, confirm } = useUi();
  const [range, setRange] = useState(initialRange('week'));
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi('/jar-transactions', { from: range.from, to: range.to, type: type || undefined, search: q, page });
  const list = data?.data || [];

  const remove = async (tx) => {
    const what = t(tx.transaction_type === 'given' ? 'tx.whatGiven' : 'tx.whatReturned', { n: tx.jar_quantity, name: tx.customer_name, date: fmtDate(tx.transaction_date) });
    if (!(await confirm({ message: t('tx.confirmDelete', { what }) }))) return;
    try {
      await api.delete(`/jar-transactions/${tx.id}`);
      toast(t('tx.deleted'));
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader title={t('tx.title')} back />
      <RangeFilter value={range} onChange={(r) => { setRange(r); setPage(1); }} />
      <input className="input" type="search" placeholder={t('entry.searchCustomer')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      <div className="flex gap-2">
        {[
          ['', t('tx.all')],
          ['given', t('entry.given')],
          ['returned', t('entry.returned')],
        ].map(([k, l]) => (
          <button key={k} className={`chip ${type === k ? 'chip-active' : ''}`} onClick={() => { setType(k); setPage(1); }}>
            {l}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {data && list.length === 0 && <Empty>{t('tx.empty')}</Empty>}

      <div className="space-y-2.5">
        {list.map((tx) => (
          <div key={tx.id} className="card !py-3">
            <div className="flex items-start justify-between gap-3">
              <Link to={`/customers/${tx.customer_id}`} className="min-w-0">
                <div className="truncate font-semibold">{tx.customer_name}</div>
                <div className="text-sm text-slate-500">{fmtDate(tx.transaction_date)}</div>
              </Link>
              <div className="text-right">
                <Badge kind={tx.transaction_type} />
                <div className="mt-1 text-lg font-bold">{t('entry.jarsN', { n: tx.jar_quantity })}</div>
              </div>
            </div>
            {tx.transaction_type === 'given' && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span>{money(tx.amount)} @ {money(tx.rate)}</span>
                <span className="text-emerald-700">{t('entry.paid')} {money(tx.paid_amount + tx.advance_amount)}</span>
                {tx.udhari_amount > 0 ? <Badge kind="udhari">{t('entry.udhari')} {money(tx.udhari_amount)}</Badge> : <Badge kind="cash" />}
              </div>
            )}
            {tx.notes && <p className="mt-1 text-sm text-slate-500">📝 {tx.notes}</p>}
            <div className="mt-2 text-right">
              <button className="text-sm font-semibold text-red-600" onClick={() => remove(tx)}>
                {t('tx.deleteBtn')}
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

      <Fab to="/entry" label={t('tx.newEntry')} />
    </div>
  );
}
