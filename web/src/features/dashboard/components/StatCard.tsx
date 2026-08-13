import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
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
  badgeText,
  trend,
  trendDirection = "up"
}: StatCardProps) {
  const styles = variantStyles[colorVariant];

  const content = (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xs p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-primary/20",
        styles.borderHover,
        styles.glow
      )}
    >
      {/* Top Accent Gradient Line */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 h-1 bg-gradient-to-r opacity-80 transition-opacity duration-300 group-hover:opacity-100",
          styles.topBar
        )}
      />

      {/* Ambient background subtle radial glow on hover */}
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-15",
          styles.glowGradient
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full shrink-0", styles.dot)} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center text-xs font-semibold",
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

        {/* Icon Container with Micro-Interaction */}
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3",
            styles.iconBg
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>

      {/* Footer Details */}
      {(subtitle || badgeText) && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <span className="text-xs font-medium text-muted-foreground truncate">
            {subtitle}
          </span>
          {badgeText && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all duration-200",
                styles.badge
              )}
            >
              {badgeText}
              <ArrowUpRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}

