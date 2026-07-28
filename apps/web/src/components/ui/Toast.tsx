import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastItem, useToastStore } from '../../store/useToastStore';

export const Toast: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const { removeToast } = useToastStore();

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-400 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/40',
    error: 'border-rose-500/40',
    warning: 'border-amber-500/40',
    info: 'border-brand-500/40',
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl glass-card shadow-2xl border transition-all duration-300 transform translate-y-0 w-80',
        borders[toast.type],
      )}
    >
      {icons[toast.type]}
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
        {toast.message && <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
