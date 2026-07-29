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
      'inline-flex items-center justify-center font-medium font-sans transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-ink text-white border border-ink hover:bg-charcoal active:scale-[0.98]',
      secondary:
        'bg-bone text-charcoal border border-border hover:bg-[#EFEEED] active:scale-[0.98]',
      outline:
        'bg-transparent text-charcoal border border-border hover:bg-bone active:scale-[0.98]',
      ghost:
        'bg-transparent text-muted border border-transparent hover:bg-bone hover:text-charcoal active:scale-[0.98]',
      danger:
        'bg-accent-red-bg text-accent-red-text border border-[#F5C0C1] hover:bg-[#FAD8D9] active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs tracking-wide rounded gap-1.5',
      md: 'px-4 py-2 text-sm rounded gap-2',
      lg: 'px-6 py-2.5 text-sm tracking-wide rounded gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Spinner size="sm" className="mr-1" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
