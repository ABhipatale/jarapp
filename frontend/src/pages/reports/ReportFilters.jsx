import CustomerPicker from '../../components/CustomerPicker';
import { t } from '../../i18n';

/** Customer filter + search box shared by all reports. */
export default function ReportFilters({ customerId, onCustomer, search, onSearch, children }) {
  return (
    <div className="no-print space-y-2">
      {children}
      <CustomerPicker value={customerId} includeInactive allowClear placeholder={t('rep.filter.allCustomers')} onChange={(id) => onCustomer(id || '')} />
      {!customerId && onSearch && (
        <input className="input" type="search" placeholder={t('rep.filter.search')} value={search} onChange={(e) => onSearch(e.target.value)} />
      )}
    </div>
  );
}
