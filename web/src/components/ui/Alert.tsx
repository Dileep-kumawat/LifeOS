import * as React from "react";
import { cn } from "../../lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-[#f6f5f4] text-[#31302e] border-[#e6e6e6]",
      destructive: "bg-red-50 text-red-900 border-red-200",
      success: "bg-emerald-50 text-emerald-900 border-emerald-200"
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn("relative w-full rounded-lg border p-4 text-sm flex gap-3 items-start", variants[variant], className)}
        {...props}
      />
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-semibold leading-none tracking-tight mb-1", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-xs leading-relaxed opacity-90", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
