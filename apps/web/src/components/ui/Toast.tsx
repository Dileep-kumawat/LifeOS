import React from 'react';
import { clsx } from 'clsx';
import { ToastItem, useToastStore } from '../../store/useToastStore';

const toastConfig = {
  success: {
    accent: 'border-l-accent-green-text bg-accent-green-bg',
    iconColor: 'text-accent-green-text',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    accent: 'border-l-accent-red-text bg-accent-red-bg',
    iconColor: 'text-accent-red-text',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  warning: {
    accent: 'border-l-accent-yellow-text bg-accent-yellow-bg',
    iconColor: 'text-accent-yellow-text',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 7v2.5M8 11.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    accent: 'border-l-charcoal bg-bone',
    iconColor: 'text-charcoal',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
};

export const Toast: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const { removeToast } = useToastStore();
  const config = toastConfig[toast.type];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 pl-4 pr-4 py-3.5 bg-surface border border-border border-l-2 rounded-[8px] shadow-editorial w-80',
        config.accent,
      )}
    >
      <span className={clsx('mt-0.5 shrink-0', config.iconColor)}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 mt-0.5 text-muted hover:text-ink transition-colors text-base leading-none"
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
