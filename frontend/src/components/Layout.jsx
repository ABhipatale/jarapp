import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useUi } from '../context/UiContext';
import { discard, outboxItems, subscribe, syncOutbox } from '../lib/outbox';
import { DevCredit } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/customers', label: 'Customers', icon: '👥' },
  { to: '/jars', label: 'Jars', icon: '💧' },
  { to: '/entry', label: 'Entry', icon: '➕', main: true },
  { to: '/payments', label: 'Payments', icon: '💰' },
  { to: '/reports', label: 'Reports', icon: '📊' },
];

const MENU = [
  { to: '/transactions', label: 'All Jar Entries', icon: '📋' },
  { to: '/expenses', label: 'Expenses', icon: '🧾' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { settings } = useSettings();
  const { logout } = useAuth();
  const { toast, confirm } = useUi();
  const [menu, setMenu] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(outboxItems);
  const [showQueue, setShowQueue] = useState(false);
  const location = useLocation();

  useEffect(() => setMenu(false), [location.pathname]);

  useEffect(() => {
    const unsub = subscribe(setQueue);
    const trySync = async () => {
      const n = await syncOutbox();
      if (n) toast(`${n} offline ${n === 1 ? 'entry' : 'entries'} synced.`);
    };
    const on = () => { setOnline(true); trySync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    trySync();
    const t = setInterval(trySync, 30000);
    return () => { unsub(); window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t); };
  }, [toast]);

  const failed = queue.filter((q) => q.error);

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <header className="no-print pt-safe sticky top-0 z-40 bg-gradient-to-r from-brand-800 to-brand-600 text-white shadow">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5">
            <img src={logo} alt="" className="h-10 w-8 rounded-md bg-white object-contain p-0.5" />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-bold">{settings.business_name || 'Sai Water Suppliers'}</div>
              <div className="truncate text-xs text-blue-100">{settings.business_address || 'Kolewadi'} · Jar Management</div>
            </div>
          </Link>
          <button className="grid h-10 w-10 place-items-center rounded-full text-2xl hover:bg-white/15" onClick={() => setMenu((m) => !m)} aria-label="Menu">
            ☰
          </button>
        </div>

        {(!online || queue.length > 0) && (
          <button onClick={() => setShowQueue((s) => !s)} className={`block w-full px-4 py-1.5 text-left text-sm ${failed.length ? 'bg-red-600' : 'bg-amber-500'} text-white`}>
            {!online ? '📴 Offline — showing last saved data. ' : ''}
            {queue.length > 0 && `${queue.length} ${queue.length === 1 ? 'entry' : 'entries'} waiting to sync${failed.length ? ` (${failed.length} need attention)` : ''} ›`}
          </button>
        )}

        {menu && (
          <div className="absolute right-3 top-14 w-56 overflow-hidden rounded-2xl bg-white text-slate-800 shadow-xl ring-1 ring-slate-200">
            {MENU.map((m) => (
              <Link key={m.to} to={m.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                <span>{m.icon}</span> {m.label}
              </Link>
            ))}
            <button
              className="flex w-full items-center gap-3 border-t px-4 py-3.5 text-left text-red-600 hover:bg-red-50"
              onClick={async () => {
                setMenu(false);
                if (queue.length && !(await confirm({ message: 'Some offline entries are not synced yet. They will stay on this phone. Logout anyway?', confirmText: 'Logout' }))) return;
                logout();
              }}
            >
              <span>🚪</span> Logout
            </button>
          </div>
        )}
      </header>

      {showQueue && queue.length > 0 && (
        <div className="no-print m-4 mb-0 rounded-2xl bg-white p-4 shadow ring-1 ring-amber-300">
          <div className="mb-2 font-semibold">Waiting to sync</div>
          {queue.map((q) => (
            <div key={q.id} className="flex items-start justify-between gap-2 border-t py-2 text-sm">
              <div>
                <div>{q.label}</div>
                {q.error && <div className="text-red-600">Not saved: {q.error}</div>}
              </div>
              {q.error && (
                <button className="btn-light btn-sm" onClick={() => discard(q.id)}>
                  Discard
                </button>
              )}
            </div>
          ))}
          <p className="mt-2 text-xs text-slate-500">Entries sync automatically when internet is back. Each entry is saved only once.</p>
        </div>
      )}

      <main className="px-4 pb-28 pt-4">
        <Outlet />
        <DevCredit className="mt-8" />
      </main>

      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-2px_10px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mx-auto grid h-16 max-w-2xl grid-cols-6">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `relative flex h-16 flex-col items-center justify-end pb-2 text-[11px] font-medium leading-none ${isActive ? 'text-brand-700' : 'text-slate-500'}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active tab indicator */}
                  {isActive && !n.main && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-brand-700" />}
                  {n.main ? (
                    // Floating + button: absolutely placed so its label lines up with the other tabs.
                    <span
                      className={`absolute -top-5 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full text-3xl font-light leading-none text-white shadow-lg shadow-brand-800/30 ring-4 ring-white ${
                        isActive ? 'bg-brand-800' : 'bg-brand-700'
                      }`}
                    >
                      +
                    </span>
                  ) : (
                    <span className="mb-1.5 grid h-6 place-items-center text-[22px] leading-none">{n.icon}</span>
                  )}
                  <span className={isActive ? 'font-bold' : ''}>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
