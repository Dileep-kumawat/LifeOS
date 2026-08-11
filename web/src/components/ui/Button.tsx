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
      default: "bg-[#0075de] text-white hover:bg-[#005bab] shadow-sm",
      secondary: "bg-[#f6f5f4] text-[#31302e] hover:bg-[#e6e6e6]",
      outline: "border border-[#e6e6e6] bg-white text-[#31302e] hover:bg-[#f6f5f4]",
      ghost: "text-[#31302e] hover:bg-[#f6f5f4]",
      destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm"
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
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de] disabled:pointer-events-none disabled:opacity-50 gap-2",
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
