import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import CustomerPicker from '../components/CustomerPicker';
import { Badge, ErrorBox, Field, Loader, Modal, PageHeader, StatCard, Stepper } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { t } from '../i18n';
import { today } from '../lib/format';
import { useApi } from '../lib/useApi';

const ACTIONS = {
  add: { title: t('jars.add'), icon: '➕', btn: 'btn-primary' },
  damaged: { title: t('jars.damaged'), icon: '⚠️', btn: 'btn-danger' },
  lost: { title: t('jars.lost'), icon: '❓', btn: 'btn-danger' },
  repaired: { title: t('jars.repaired'), icon: '🔧', btn: 'btn-primary' },
  found: { title: t('jars.found'), icon: '🔍', btn: 'btn-primary' },
};

const STATUSES = ['available', 'with_customer', 'returned', 'damaged', 'lost'];
const STATUS_LABELS = Object.fromEntries(STATUSES.map((st) => [st, t(`jars.st.${st}`)]));

export default function Jars() {
  const { settings } = useSettings();
  const { toast } = useUi();
  const tracking = settings.jar_tracking === '1' || settings.jar_tracking === true;
  const [statusFilter, setStatusFilter] = useState('');
  const { data, loading, error, reload } = useApi('/jars', { status: statusFilter || undefined });
  const [action, setAction] = useState(null);
  const [qty, setQty] = useState('1');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [editJar, setEditJar] = useState(null);

  const s = data?.summary;

  const runAction = async () => {
    const n = parseInt(qty, 10) || 0;
    if (n < 1) return toast(t('entry.qtyMin'), 'error');
    setBusy(true);
    try {
      const res = action === 'add' ? await api.post('/jars', { quantity: n }) : await api.post('/jars/adjust', { action, quantity: n, date });
      toast(res.data.message);
      setAction(null);
      setQty('1');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveJar = async () => {
    setBusy(true);
    try {
      await api.put(`/jars/${editJar.id}`, { status: editJar.status, customer_id: editJar.customer_id || null });
      toast(t('jars.updated'));
      setEditJar(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('jars.title')} subtitle={t('jars.subtitle')} />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <Loader />}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <StatCard label={t('jars.availableLabel')} value={s.available_jars} icon="✅" tone="green" sub={t('jars.availableSub')} />
            </div>
            <StatCard label={t('jars.totalJars')} value={s.total_jars} icon="💧" tone="slate" />
            <StatCard label={t('jars.withCustomers')} value={s.customer_jars} icon="🏠" tone="blue" to="/reports/jar-status" />
            <StatCard label={t('jars.damagedStat')} value={s.damaged_jars} icon="⚠️" tone="red" />
            <StatCard label={t('jars.lostStat')} value={s.lost_jars} icon="❓" tone="amber" />
          </div>

          {s.total_jars === 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
              {t('jars.startHint1')} <b>{t('jars.add')}</b> {t('jars.startHint2')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ACTIONS).map(([k, a]) => (
              <button key={k} className={`btn-light ${k === 'add' ? 'col-span-2 !bg-brand-700 !text-white' : ''}`} onClick={() => setAction(k)}>
                {a.icon} {a.title}
              </button>
            ))}
          </div>

          <Link to="/reports/jar-status" className="card flex items-center justify-between">
            <span>{t('jars.whoHas')}</span>
            <span className="text-brand-700">›</span>
          </Link>

          {tracking ? (
            <section className="card">
              <h2 className="mb-2 font-semibold">{t('jars.numbers')}</h2>
              <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
                {['', ...STATUSES].map((st) => (
                  <button key={st} className={`chip ${statusFilter === st ? 'chip-active' : ''}`} onClick={() => setStatusFilter(st)}>
                    {st ? STATUS_LABELS[st] : t('jars.all')}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.jars.data.map((j) => (
                  <button key={j.id} className="rounded-xl bg-slate-50 p-2.5 text-left ring-1 ring-slate-200" onClick={() => setEditJar({ ...j })}>
                    <div className="font-mono font-semibold">{j.jar_number}</div>
                    <Badge kind={j.status} />
                    {j.customer_name && <div className="mt-1 truncate text-xs text-slate-500">{j.customer_name}</div>}
                  </button>
                ))}
              </div>
              {data.jars.last_page > 1 && <p className="mt-2 text-xs text-slate-500">{t('jars.showingFirst', { n: data.jars.data.length, total: data.jars.total })}</p>}
            </section>
          ) : (
            <p className="text-center text-sm text-slate-500">
              {t('jars.countHint1')} <Link to="/settings" className="font-semibold text-brand-700">{t('jars.countHintLink')}</Link> {t('jars.countHint2')}
            </p>
          )}
        </>
      )}

      {action && (
        <Modal title={ACTIONS[action].title} onClose={() => setAction(null)}>
          <div className="space-y-4">
            <Field group label={t('jars.howMany')}>
              <Stepper value={qty} onChange={(v) => setQty(String(v))} min={1} />
            </Field>
            {action !== 'add' && (
              <Field label={t('entry.date')}>
                <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
              </Field>
            )}
            <button className={`${ACTIONS[action].btn} w-full`} disabled={busy} onClick={runAction}>
              {busy ? t('entry.saving') : t('entry.save')}
            </button>
          </div>
        </Modal>
      )}

      {editJar && (
        <Modal title={editJar.jar_number} onClose={() => setEditJar(null)}>
          <div className="space-y-4">
            <Field group label={t('jars.status')}>
              <select className="input" value={editJar.status} onChange={(e) => setEditJar({ ...editJar, status: e.target.value })}>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </Field>
            {editJar.status === 'with_customer' && (
              <Field group label={t('entry.customer')}>
                <CustomerPicker value={editJar.customer_id || ''} onChange={(id) => setEditJar((j) => ({ ...j, customer_id: id }))} />
              </Field>
            )}
            <button className="btn-primary w-full" disabled={busy} onClick={saveJar}>
              {busy ? t('entry.saving') : t('entry.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
