import { fmtDate, money } from '../lib/format';
import { Badge } from './ui';

/** Date | Given | Returned | Net Jar | Amount | Paid | Udhari | Balance */
export default function LedgerTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Date</th>
            <th className="num">Given</th>
            <th className="num">Returned</th>
            <th className="num">Net Jar</th>
            <th className="num">Amount</th>
            <th className="num">Paid</th>
            <th className="num">Udhari</th>
            <th className="num">Balance</th>
            <th className="num">Jars</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {fmtDate(r.entry_date)}
                {r.entry_type === 'payment' && (
                  <span className="ml-1.5">
                    <Badge kind="cash">Payment</Badge>
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
