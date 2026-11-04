import { createContext, useContext, useMemo } from 'react';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { toasts, notify, dismiss } = useToast();
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToastContext harus dipakai di dalam ToastProvider.');
  return context;
}
