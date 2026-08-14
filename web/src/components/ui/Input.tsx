import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] placeholder:text-[#a39e98] transition-all duration-150 ease-out hover:border-[#c1c6d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de] focus-visible:border-[#0075de] focus-visible:shadow-xs disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
