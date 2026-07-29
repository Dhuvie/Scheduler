'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
  error: <XCircle size={16} className="text-red-500 shrink-0" />,
  warning: <AlertCircle size={16} className="text-amber-500 shrink-0" />,
  info: <AlertCircle size={16} className="text-blue-500 shrink-0" />,
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration || 5000);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div className="pointer-events-auto bg-white border border-gray-200 rounded-lg shadow-lg flex items-start gap-3 p-3 min-w-[300px] max-w-[380px] animate-fade-in">
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{toast.title}</p>
        {toast.message && <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const removeToast = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p.slice(-4), { ...opts, id }]);
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id="toast-container">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onRemove={removeToast} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
