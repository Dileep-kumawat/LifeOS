import * as React from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  "aria-label"?: string;
}

/**
 * Accessible toggle switch (role="switch"). Used by the notification
 * preference toggles. Focus ring matches the rest of the design system.
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        onClick?.(e);
        onCheckedChange?.(!checked);
      }}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de] focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        checked ? "bg-[#0075de]" : "bg-[#d1d0ce] hover:bg-[#c1c0bd]",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
