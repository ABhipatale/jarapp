import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import { t } from '../i18n';
import { PendingText } from './ui';

let cache = null; // shared across screens; refreshed on each mount

/**
 * Search-as-you-type customer selector (name or mobile).
 * Loads the customer list once and filters on the phone — instant even on slow networks.
 */
export default function CustomerPicker({ value, onChange, placeholder = t('common.search'), includeInactive = false, allowClear = false }) {
  const [list, setList] = useState(cache || []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    api
      .get('/customers')
      .then((r) => {
        cache = r.data.data;
        setList(cache);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const selected = useMemo(() => list.find((c) => c.id === Number(value)) || null, [list, value]);

  useEffect(() => {
    if (selected) onChange?.(selected.id, selected, { silent: true });
    // Push fresh balances to the parent when the list loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.current_jars, selected?.pending_amount]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list
      .filter((c) => includeInactive || c.status === 'active' || c.id === Number(value))
      .filter((c) => !s || c.name.toLowerCase().includes(s) || c.mobile.includes(s))
      .slice(0, 40);
  }, [list, q, includeInactive, value]);

  if (selected && !open) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-500 bg-brand-50 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{selected.name}</div>
          <div className="text-sm text-slate-600">
            📱 {selected.mobile} · 💧 {t('common.jarsCount', { n: selected.current_jars })} · <PendingText amount={selected.pending_amount} />
          </div>
        </div>
        <button type="button" className="btn-light btn-sm" onClick={() => { setQ(''); setOpen(true); }}>
          {t('common.change')}
        </button>
        {allowClear && (
          <button type="button" className="btn-light btn-sm" onClick={() => onChange(null, null)} aria-label={t('picker.clear')}>
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={box}>
      <input
        className="input"
        value={q}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          {matches.length === 0 && <div className="p-4 text-center text-sm text-slate-500">{t('picker.noCustomer')}</div>}
          {matches.map((c) => (
            <button
              type="button"
              key={c.id}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 text-left last:border-0 hover:bg-slate-50"
              onClick={() => { onChange(c.id, c); setOpen(false); setQ(''); }}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="text-sm text-slate-500">{c.mobile}</span>
              </span>
              <span className="shrink-0 text-right text-sm">
                <span className="block">💧 {c.current_jars}</span>
                <PendingText amount={c.pending_amount} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
