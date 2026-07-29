import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'error' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  ...props
}) => {
  const variants = {
    brand:   'bg-[#F7F6F3] text-charcoal border-border',
    success: 'bg-accent-green-bg text-accent-green-text border-[#C8DEC7]',
    warning: 'bg-accent-yellow-bg text-accent-yellow-text border-[#E8D9A0]',
    error:   'bg-accent-red-bg text-accent-red-text border-[#F5C0C1]',
    neutral: 'bg-bone text-muted border-border',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border tracking-[0.05em] uppercase',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
