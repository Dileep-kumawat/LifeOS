import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../../lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorVariant?: "blue" | "emerald" | "amber" | "purple" | "rose";
  href?: string;
  badgeText?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
}

const variantStyles = {
  blue: {
    topBar: "from-blue-500 via-sky-400 to-blue-600",
    glowGradient: "from-blue-500 to-indigo-500",
    borderHover: "group-hover:border-blue-500/40 dark:group-hover:border-blue-500/40",
    dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)] animate-pulse",
    iconBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20 shadow-xs shadow-blue-500/10",
    badge: "bg-white/90 text-blue-600 border border-blue-200/80 shadow-2xs group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-700 dark:bg-slate-900/90 dark:text-blue-300 dark:border-blue-800/80 dark:group-hover:bg-blue-950/60",
    glow: "group-hover:shadow-blue-500/10"
  },
  emerald: {
    topBar: "from-emerald-500 via-teal-400 to-emerald-600",
    glowGradient: "from-emerald-500 to-teal-500",
    borderHover: "group-hover:border-emerald-500/40 dark:group-hover:border-emerald-500/40",
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20 shadow-xs shadow-emerald-500/10",
    badge: "bg-white/90 text-emerald-600 border border-emerald-200/80 shadow-2xs group-hover:bg-emerald-50 group-hover:border-emerald-300 group-hover:text-emerald-700 dark:bg-slate-900/90 dark:text-emerald-300 dark:border-emerald-800/80 dark:group-hover:bg-emerald-950/60",
    glow: "group-hover:shadow-emerald-500/10"
  },
  amber: {
    topBar: "from-amber-500 via-orange-400 to-amber-600",
    glowGradient: "from-amber-500 to-orange-500",
    borderHover: "group-hover:border-amber-500/40 dark:group-hover:border-amber-500/40",
    dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] animate-pulse",
    iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20 shadow-xs shadow-amber-500/10",
    badge: "bg-white/90 text-amber-600 border border-amber-200/80 shadow-2xs group-hover:bg-amber-50 group-hover:border-amber-300 group-hover:text-amber-700 dark:bg-slate-900/90 dark:text-amber-300 dark:border-amber-800/80 dark:group-hover:bg-amber-950/60",
    glow: "group-hover:shadow-amber-500/10"
  },
  purple: {
    topBar: "from-purple-500 via-fuchsia-400 to-purple-600",
    glowGradient: "from-purple-500 to-pink-500",
    borderHover: "group-hover:border-purple-500/40 dark:group-hover:border-purple-500/40",
    dot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)] animate-pulse",
    iconBg: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-500/20 shadow-xs shadow-purple-500/10",
    badge: "bg-white/90 text-purple-600 border border-purple-200/80 shadow-2xs group-hover:bg-purple-50 group-hover:border-purple-300 group-hover:text-purple-700 dark:bg-slate-900/90 dark:text-purple-300 dark:border-purple-800/80 dark:group-hover:bg-purple-950/60",
    glow: "group-hover:shadow-purple-500/10"
  },
  rose: {
    topBar: "from-rose-500 via-pink-400 to-rose-600",
    glowGradient: "from-rose-500 to-red-500",
    borderHover: "group-hover:border-rose-500/40 dark:group-hover:border-rose-500/40",
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse",
    iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-500/20 shadow-xs shadow-rose-500/10",
    badge: "bg-white/90 text-rose-600 border border-rose-200/80 shadow-2xs group-hover:bg-rose-50 group-hover:border-rose-300 group-hover:text-rose-700 dark:bg-slate-900/90 dark:text-rose-300 dark:border-rose-800/80 dark:group-hover:bg-rose-950/60",
    glow: "group-hover:shadow-rose-500/10"
  }
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorVariant = "blue",
  href,
  trend,
  trendDirection = "up"
}: StatCardProps) {
  const styles = variantStyles[colorVariant];

  const content = (
    <div
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/20",
        styles.glow
      )}
    >
      {/* Side Accent Color Bar */}
      <div
        className={cn(
          "w-2.5 h-12 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-105",
          colorVariant === "blue" && "bg-blue-500",
          colorVariant === "emerald" && "bg-emerald-500",
          colorVariant === "amber" && "bg-amber-500",
          colorVariant === "purple" && "bg-purple-500",
          colorVariant === "rose" && "bg-rose-500"
        )}
      />

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && <Icon className="size-3.5 text-muted-foreground shrink-0" />}
            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-2xl font-extrabold tracking-tight text-foreground">
            {value}
          </span>
          {subtitle && (
            <span className="text-xs font-normal text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={cn(
                "inline-flex items-center text-xs font-semibold shrink-0 ml-auto",
                trendDirection === "up" && "text-emerald-600 dark:text-emerald-400",
                trendDirection === "down" && "text-rose-600 dark:text-rose-400",
                trendDirection === "neutral" && "text-muted-foreground"
              )}
            >
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}


