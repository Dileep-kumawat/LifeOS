import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'error' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'brand',
  ...props
}) => {
  const variants = {
    brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
