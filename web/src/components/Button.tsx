import type { ButtonHTMLAttributes } from "react";

// Minimal first component for Phase 0 — establishes the pattern (Tailwind
// utility classes, typed props, default export) every later shared
// component in /web/src/components follows. Swap in shadcn/ui's generated
// Button here once `npx shadcn@latest add button` has been run; keeping
// this simple avoids blocking Phase 0 on the shadcn CLI being wired up.
type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  ghost: "bg-transparent text-slate-900 hover:bg-slate-100"
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
