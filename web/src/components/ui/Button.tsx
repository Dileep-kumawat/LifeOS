import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", isLoading, disabled, children, ...props },
    ref
  ) => {
    const variants = {
      default: "bg-[#0075de] text-white hover:bg-[#005bab] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 shadow-sm",
      secondary: "bg-[#f6f5f4] text-[#31302e] hover:bg-[#e6e6e6] hover:-translate-y-0.5 active:translate-y-0",
      outline: "border border-[#e6e6e6] bg-white text-[#31302e] hover:bg-[#f6f5f4] hover:border-[#c1c6d5] hover:-translate-y-0.5 active:translate-y-0",
      ghost: "text-[#31302e] hover:bg-[#f6f5f4] hover:text-[#000000] active:scale-[0.98]",
      destructive: "bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs rounded-md",
      lg: "h-11 px-6 text-base rounded-md",
      icon: "size-9 p-0 flex items-center justify-center"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de] focus-visible:ring-offset-1 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 disabled:hover:translate-y-0 gap-2 cursor-pointer select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
