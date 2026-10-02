import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerPicker from '../../components/CustomerPicker';
import { Modal, PageHeader } from '../../components/ui';
import { t } from '../../i18n';

const REPORTS = [
  { to: '/reports/daily', icon: '📅', title: t('rep.daily.title'), sub: t('rep.daily.sub') },
  { to: '/reports/weekly', icon: '🗓', title: t('rep.weekly.title'), sub: t('rep.weekly.sub') },
  { to: '/reports/monthly', icon: '📆', title: t('rep.monthly.title'), sub: t('rep.monthly.sub') },
  { ledger: true, icon: '📒', title: t('rep.ledger.title'), sub: t('rep.ledger.sub') },
  { to: '/reports/jar-status', icon: '💧', title: t('rep.jarStatus.cardTitle'), sub: t('rep.jarStatus.sub') },
  { to: '/reports/cash', icon: '💵', title: t('rep.cash.title'), sub: t('rep.cash.sub') },
  { to: '/reports/udhari', icon: '📒', title: t('rep.udhari.title'), sub: t('rep.udhari.sub') },
  { to: '/reports/pending', icon: '⏳', title: t('rep.pending.cardTitle'), sub: t('rep.pending.sub') },
];

export default function Reports() {
  const navigate = useNavigate();
  const [pickLedger, setPickLedger] = useState(false);

  return (
    <div>
      <PageHeader title={t('rep.title')} />
      <div className="space-y-2.5">
        {REPORTS.map((r) => {
          const inner = (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-2xl">{r.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.title}</span>
                <span className="block truncate text-sm text-slate-500">{r.sub}</span>
              </span>
              <span className="text-xl text-slate-400">›</span>
            </>
          );
          return r.ledger ? (
            <button key={r.title} className="card flex w-full items-center gap-3 text-left active:bg-slate-50" onClick={() => setPickLedger(true)}>
              {inner}
            </button>
          ) : (
            <Link key={r.to} to={r.to} className="card flex items-center gap-3 active:bg-slate-50">
              {inner}
            </Link>
          );
        })}
      </div>

      {pickLedger && (
        <Modal title={t('rep.chooseCustomer')} onClose={() => setPickLedger(false)}>
          <div className="min-h-80">
            <CustomerPicker includeInactive value="" onChange={(id) => id && navigate(`/customers/${id}/ledger`)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
