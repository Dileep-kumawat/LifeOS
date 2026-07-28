import React from 'react';
import { clsx } from 'clsx';
import { Spinner } from './Spinner.jsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl';

    const variants = {
      primary:
        'bg-brand-600 hover:bg-brand-500 text-white shadow-glow hover:shadow-glow-lg focus:ring-brand-500 border border-brand-500/50',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-700',
      outline:
        'border border-slate-700 hover:border-slate-500 text-slate-200 hover:bg-slate-800/50',
      ghost:
        'text-slate-300 hover:bg-slate-800/50 hover:text-white',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 shadow-sm',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base font-semibold gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Spinner size="sm" className="mr-1.5" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
