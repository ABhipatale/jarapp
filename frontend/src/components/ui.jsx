import { Link, useNavigate } from 'react-router-dom';
import { money } from '../lib/format';

export function PageHeader({ title, back, right, subtitle }) {
  const navigate = useNavigate();
  return (
    <div className="no-print mb-3 flex items-center gap-2">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="-ml-1 grid h-10 w-10 place-items-center rounded-full text-2xl text-slate-700 hover:bg-slate-200"
          aria-label="Back"
        >
          ‹
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const TONES = {
  blue: 'bg-brand-50 text-brand-800',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-800',
  slate: 'bg-slate-100 text-slate-700',
  purple: 'bg-violet-50 text-violet-700',
};

export function StatCard({ label, value, icon, tone = 'slate', sub, to }) {
  const body = (
    <div className={`h-full rounded-2xl p-3.5 ${TONES[tone]} ring-1 ring-black/5`}>
      <div className="flex items-center justify-between text-[13px] font-medium opacity-80">
        <span>{label}</span>
        {icon && <span className="text-lg leading-none">{icon}</span>}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs opacity-75">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

const BADGES = {
  cash: 'bg-emerald-100 text-emerald-800',
  udhari: 'bg-amber-100 text-amber-800',
  available: 'bg-emerald-100 text-emerald-800',
  with_customer: 'bg-sky-100 text-sky-800',
  returned: 'bg-indigo-100 text-indigo-800',
  damaged: 'bg-red-100 text-red-700',
  lost: 'bg-slate-200 text-slate-700',
  given: 'bg-sky-100 text-sky-800',
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-200 text-slate-600',
  upi: 'bg-violet-100 text-violet-800',
  bank: 'bg-indigo-100 text-indigo-800',
  advance: 'bg-teal-100 text-teal-800',
};

const BADGE_TEXT = {
  with_customer: 'With Customer',
  given: 'Given',
  returned: 'Returned',
  upi: 'UPI',
};

export function Badge({ kind, children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGES[kind] || BADGES.inactive}`}>
      {children || BADGE_TEXT[kind] || (kind ? kind[0].toUpperCase() + kind.slice(1) : '')}
    </span>
  );
}

/** Pending amount shown as Udhari (red) or Advance (green). */
export function PendingText({ amount, className = '' }) {
  const n = Number(amount) || 0;
  if (n > 0) return <span className={`font-semibold text-red-600 ${className}`}>{money(n)}</span>;
  if (n < 0) return <span className={`font-semibold text-emerald-700 ${className}`}>{money(-n)} adv</span>;
  return <span className={`text-slate-400 ${className}`}>₹0</span>;
}

/**
 * Label + control. Use group for button groups/steppers/pickers: a <label> would
 * forward taps on its text to the first button inside (e.g. the "−" of a stepper).
 */
export function Field({ label, hint, children, className = '', group = false }) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </Tag>
  );
}

/** Big toggle buttons, e.g. [GIVE JAR] [RETURN JAR]. */
export function Segmented({ value, onChange, options, size = 'lg' }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-xl font-bold tracking-wide ring-2 transition active:scale-[.98] ${size === 'lg' ? 'py-4 text-base' : 'py-2.5 text-sm'} ${
              active ? o.activeClass || 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-600 ring-slate-200'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0 }) {
  const n = Number(value) || 0;
  return (
    <div className="flex items-stretch gap-2">
      <button type="button" className="btn-light w-14 text-2xl" onClick={() => onChange(Math.max(min, n - 1))} aria-label="Less">
        −
      </button>
      <input
        className="input text-center text-2xl font-bold tabular-nums"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="btn-light w-14 text-2xl" onClick={() => onChange(n + 1)} aria-label="More">
        +
      </button>
    </div>
  );
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function Empty({ children = 'Nothing here yet.' }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-slate-500">{children}</div>;
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="rounded-2xl bg-red-50 p-4 text-red-700 ring-1 ring-red-200">
      <p>{message}</p>
      {onRetry && (
        <button className="btn-light btn-sm mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Sticky round "+" button above the bottom nav. */
export function Fab({ to, label }) {
  return (
    <Link
      to={to}
      className="no-print fixed bottom-24 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-brand-700 px-5 text-base font-semibold text-white shadow-lg shadow-brand-800/30 active:scale-95"
    >
      <span className="text-2xl leading-none">+</span> {label}
    </Link>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="grid h-9 w-9 place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Header printed on paper / PDF only. */
export function PrintHeader({ settings, title, subtitle }) {
  return (
    <div className="print-only mb-4 border-b pb-3">
      <div className="text-lg font-bold">{settings?.business_name || 'Sai Water Suppliers'}</div>
      <div className="text-sm text-slate-600">
        {settings?.business_address || 'Kolewadi'}
        {settings?.business_mobile ? ` · ${settings.business_mobile}` : ''}
      </div>
      <div className="mt-2 font-semibold">{title}</div>
      {subtitle && <div className="text-sm text-slate-600">{subtitle}</div>}
    </div>
  );
}

/** Developer credit shown at the bottom of every screen. */
export function DevCredit({ className = '' }) {
  return (
    <div className={`no-print flex flex-col items-center gap-0.5 text-center text-xs text-slate-400 ${className}`}>
      <span>
        Developed by <span className="font-semibold text-slate-500">AB Technology Services</span>
      </span>
      <a href="tel:7666287015" className="font-medium text-slate-500">
        📞 7666287015
      </a>
    </div>
  );
}
