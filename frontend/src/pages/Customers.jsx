import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Empty, ErrorBox, Fab, Loader, PageHeader, PendingText } from '../components/ui';
import { t } from '../i18n';
import { useApi, useDebounced } from '../lib/useApi';

const FILTERS = [
  { key: '', label: t('cust.filter.all') },
  { key: 'active', label: t('cust.filter.active') },
  { key: 'pending', label: t('cust.filter.pending') },
  { key: 'jars', label: t('cust.filter.jars') },
  { key: 'inactive', label: t('cust.filter.inactive') },
];

export default function Customers() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const q = useDebounced(search);
  const params = { search: q };
  if (filter === 'active' || filter === 'inactive') params.status = filter;
  if (filter === 'pending' || filter === 'jars') params.filter = filter;
  const { data, loading, error, reload } = useApi('/customers', params);
  const list = data?.data || [];

  return (
    <div>
      <PageHeader title={t('cust.title')} subtitle={data ? t('cust.count', { n: list.length }) : ''} />

      <div className="sticky top-[60px] z-20 -mx-4 bg-slate-100/95 px-4 pb-3 pt-1 backdrop-blur">
        <input className="input" type="search" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <button key={f.key} className={`chip ${filter === f.key ? 'chip-active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loader />}
      {data && list.length === 0 && <Empty>{t('cust.none')}</Empty>}

      <div className="space-y-2.5">
        {list.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}`} className="card flex items-center gap-3 !py-3 active:bg-slate-50">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-lg font-bold text-brand-700">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{c.name}</span>
                {c.status === 'inactive' && <Badge kind="inactive" />}
              </div>
              <div className="text-sm text-slate-500">{c.mobile}</div>
            </div>
            <div className="shrink-0 text-right text-sm">
              <div>
                💧 <b>{c.current_jars}</b> {t('common.jarsWord')}
              </div>
              <PendingText amount={c.pending_amount} />
            </div>
          </Link>
        ))}
      </div>

      <Fab to="/customers/new" label={t('cust.add')} />
    </div>
  );
}
