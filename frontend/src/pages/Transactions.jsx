import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import RangeFilter, { initialRange } from '../components/RangeFilter';
import { Badge, Empty, ErrorBox, Fab, Loader, PageHeader } from '../components/ui';
import { useUi } from '../context/UiContext';
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

  const remove = async (t) => {
    const what = `${t.transaction_type === 'given' ? 'Give' : 'Return'} ${t.jar_quantity} jars – ${t.customer_name} (${fmtDate(t.transaction_date)})`;
    if (!(await confirm({ message: `Delete this entry? ${what}` }))) return;
    try {
      await api.delete(`/jar-transactions/${t.id}`);
      toast('Entry deleted.');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader title="Jar Entries" back />
      <RangeFilter value={range} onChange={(r) => { setRange(r); setPage(1); }} />
      <input className="input" type="search" placeholder="🔍 Search customer" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      <div className="flex gap-2">
        {[
          ['', 'All'],
          ['given', 'Given'],
          ['returned', 'Returned'],
        ].map(([k, l]) => (
          <button key={k} className={`chip ${type === k ? 'chip-active' : ''}`} onClick={() => { setType(k); setPage(1); }}>
            {l}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {data && list.length === 0 && <Empty>No entries found.</Empty>}

      <div className="space-y-2.5">
        {list.map((t) => (
          <div key={t.id} className="card !py-3">
            <div className="flex items-start justify-between gap-3">
              <Link to={`/customers/${t.customer_id}`} className="min-w-0">
                <div className="truncate font-semibold">{t.customer_name}</div>
                <div className="text-sm text-slate-500">{fmtDate(t.transaction_date)}</div>
              </Link>
              <div className="text-right">
                <Badge kind={t.transaction_type} />
                <div className="mt-1 text-lg font-bold">{t.jar_quantity} jars</div>
              </div>
            </div>
            {t.transaction_type === 'given' && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span>{money(t.amount)} @ {money(t.rate)}</span>
                <span className="text-emerald-700">Paid {money(t.paid_amount + t.advance_amount)}</span>
                {t.udhari_amount > 0 ? <Badge kind="udhari">Udhari {money(t.udhari_amount)}</Badge> : <Badge kind="cash" />}
              </div>
            )}
            {t.notes && <p className="mt-1 text-sm text-slate-500">📝 {t.notes}</p>}
            <div className="mt-2 text-right">
              <button className="text-sm font-semibold text-red-600" onClick={() => remove(t)}>
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between">
          <button className="btn-light btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Newer</button>
          <span className="text-sm text-slate-500">Page {page} / {data.last_page}</span>
          <button className="btn-light btn-sm" disabled={page >= data.last_page} onClick={() => setPage(page + 1)}>Older ›</button>
        </div>
      )}

      <Fab to="/entry" label="New Entry" />
    </div>
  );
}
