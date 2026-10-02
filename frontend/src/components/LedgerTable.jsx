import { t } from '../i18n';
import { fmtDate, money } from '../lib/format';
import { Badge } from './ui';

/** Date | Given | Returned | Net Jar | Amount | Paid | Udhari | Balance */
export default function LedgerTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>{t('ledger.date')}</th>
            <th className="num">{t('ledger.given')}</th>
            <th className="num">{t('ledger.returned')}</th>
            <th className="num">{t('ledger.netJar')}</th>
            <th className="num">{t('ledger.amount')}</th>
            <th className="num">{t('ledger.paid')}</th>
            <th className="num">{t('ledger.udhari')}</th>
            <th className="num">{t('ledger.balance')}</th>
            <th className="num">{t('ledger.jars')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {fmtDate(r.entry_date)}
                {r.entry_type === 'payment' && (
                  <span className="ml-1.5">
                    <Badge kind="cash">{t('ledger.payment')}</Badge>
                  </span>
                )}
              </td>
              <td className="num">{r.jars_given || '–'}</td>
              <td className="num">{r.jars_returned || '–'}</td>
              <td className="num">{r.entry_type === 'payment' ? '–' : r.net_jars}</td>
              <td className="num">{r.amount ? money(r.amount) : '–'}</td>
              <td className="num text-emerald-700">{r.paid ? money(r.paid) : '–'}</td>
              <td className="num text-amber-700">{r.udhari ? money(r.udhari) : '–'}</td>
              <td className={`num font-semibold ${r.balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{money(r.balance)}</td>
              <td className="num">{r.jar_balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
