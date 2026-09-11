import { Skeleton } from "./Skeleton";
import { Loader } from "./Loader";
import { cn } from "../../lib/utils";

export interface RouteLoadingFallbackProps {
  variant?: "default" | "editor" | "analytics" | "scan";
  className?: string;
}

export function RouteLoadingFallback({
  variant = "default",
  className
}: RouteLoadingFallbackProps) {
  if (variant === "editor") {
    return (
      <div
        role="status"
        aria-label="Loading notes editor..."
        className={cn(
          "max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6 animate-in fade-in duration-200",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 bg-[#e9e8e7]" />
          <Skeleton className="h-9 w-24 rounded-lg bg-[#e9e8e7]" />
        </div>
        {/* Title skeleton */}
        <Skeleton className="h-10 w-3/4 rounded-lg bg-[#e9e8e7]" />
        {/* Editor body skeleton */}
        <div className="space-y-4 pt-4">
          <Skeleton className="h-5 w-full bg-[#e9e8e7]" />
          <Skeleton className="h-5 w-5/6 bg-[#e9e8e7]" />
          <Skeleton className="h-5 w-4/6 bg-[#e9e8e7]" />
          <Skeleton className="h-28 w-full rounded-xl bg-[#e9e8e7]" />
          <Skeleton className="h-5 w-3/4 bg-[#e9e8e7]" />
        </div>
      </div>
    );
  }

  if (variant === "analytics") {
    return (
      <div
        role="status"
        aria-label="Loading analytics dashboard..."
        className={cn(
          "max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8 animate-in fade-in duration-200",
          className
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52 bg-[#e9e8e7]" />
            <Skeleton className="h-4 w-72 bg-[#e9e8e7]" />
          </div>
          <Skeleton className="h-10 w-48 rounded-lg bg-[#e9e8e7]" />
        </div>
        {/* KPI Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-[#c1c6d5]/40 shadow-xs space-y-3">
              <Skeleton className="h-4 w-24 bg-[#e9e8e7]" />
              <Skeleton className="h-7 w-32 bg-[#e9e8e7]" />
              <Skeleton className="h-3 w-20 bg-[#e9e8e7]" />
            </div>
          ))}
        </div>
        {/* Chart area skeleton */}
        <div className="p-6 rounded-2xl bg-white border border-[#c1c6d5]/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 bg-[#e9e8e7]" />
            <Skeleton className="h-8 w-28 rounded-lg bg-[#e9e8e7]" />
          </div>
          <Skeleton className="h-72 w-full rounded-xl bg-[#f6f5f4]" />
        </div>
      </div>
    );
  }

  if (variant === "scan") {
    return (
      <div
        role="status"
        aria-label="Loading OCR scan flow..."
        className={cn(
          "max-w-3xl mx-auto px-6 py-12 flex flex-col items-center gap-6 animate-in fade-in duration-200",
          className
        )}
      >
        <Skeleton className="h-8 w-60 bg-[#e9e8e7]" />
        <Skeleton className="h-4 w-80 bg-[#e9e8e7]" />
        <div className="w-full h-64 border-2 border-dashed border-[#c1c6d5] rounded-2xl flex flex-col items-center justify-center gap-4 bg-white/60">
          <Loader className="text-[#005db2]" />
          <Skeleton className="h-4 w-48 bg-[#e9e8e7]" />
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading content..."
      className={cn(
        "flex-1 flex flex-col items-center justify-center min-h-[350px] p-8 gap-4 animate-in fade-in duration-200",
        className
      )}
    >
      <Loader className="text-[#005db2]" />
      <p className="text-sm font-medium text-[#717784] tracking-wide">
        Loading...
      </p>
    </div>
  );
}
