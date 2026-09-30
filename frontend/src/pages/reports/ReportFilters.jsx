import CustomerPicker from '../../components/CustomerPicker';

/** Customer filter + search box shared by all reports. */
export default function ReportFilters({ customerId, onCustomer, search, onSearch, children }) {
  return (
    <div className="no-print space-y-2">
      {children}
      <CustomerPicker value={customerId} includeInactive allowClear placeholder="All customers (tap to filter)" onChange={(id) => onCustomer(id || '')} />
      {!customerId && onSearch && (
        <input className="input" type="search" placeholder="🔍 Search name or mobile" value={search} onChange={(e) => onSearch(e.target.value)} />
      )}
    </div>
  );
}
