import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerPicker from '../../components/CustomerPicker';
import { Modal, PageHeader } from '../../components/ui';

const REPORTS = [
  { to: '/reports/daily', icon: '📅', title: 'Daily Report', sub: 'आजचा व्यवहार' },
  { to: '/reports/weekly', icon: '🗓', title: 'Weekly Report', sub: 'Mon – Sun' },
  { to: '/reports/monthly', icon: '📆', title: 'Monthly Report', sub: 'Month summary, damaged / lost' },
  { ledger: true, icon: '📒', title: 'Customer Ledger', sub: 'Full statement of one customer' },
  { to: '/reports/jar-status', icon: '💧', title: 'Jar Status Report', sub: 'कोणाकडे किती जार आहेत?' },
  { to: '/reports/cash', icon: '💵', title: 'Cash Report', sub: 'Day-wise cash, UPI, expenses' },
  { to: '/reports/udhari', icon: '📒', title: 'Udhari Report', sub: 'Udhari given & recovered' },
  { to: '/reports/pending', icon: '⏳', title: 'Pending Payment Report', sub: 'कोणाकडून पैसे घ्यायचे आहेत?' },
];

export default function Reports() {
  const navigate = useNavigate();
  const [pickLedger, setPickLedger] = useState(false);

  return (
    <div>
      <PageHeader title="Reports" />
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
        <Modal title="Choose customer" onClose={() => setPickLedger(false)}>
          <div className="min-h-80">
            <CustomerPicker includeInactive value="" onChange={(id) => id && navigate(`/customers/${id}/ledger`)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
