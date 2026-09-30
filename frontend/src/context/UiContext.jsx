import { createContext, useCallback, useContext, useRef, useState } from 'react';

/** Toasts + "Are you sure?" confirmation dialog, available everywhere. */
const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolver = useRef(null);

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 4500 : 2800);
  }, []);

  const confirm = useCallback((opts) => {
    setConfirmState({
      title: 'Are you sure?',
      confirmText: 'Yes, Delete',
      danger: true,
      ...(typeof opts === 'string' ? { message: opts } : opts),
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setConfirmState(null);
  };

  return (
    <UiContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="no-print pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              t.type === 'error' ? 'bg-red-600' : t.type === 'info' ? 'bg-slate-800' : 'bg-emerald-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="no-print fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => close(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{confirmState.title}</h2>
            {confirmState.message && <p className="mt-1.5 text-slate-600">{confirmState.message}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="btn-light" onClick={() => close(false)}>Cancel</button>
              <button className={confirmState.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)} autoFocus>
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </UiContext.Provider>
  );
}

export function useUi() {
  return useContext(UiContext);
}
