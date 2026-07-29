import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

// Scroll reveal hook
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

// Inline SVG icons
const StateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const stats = [
  { label: 'Zustand State Stores', sub: 'Theme, Toast, and Auth state ready', icon: <StateIcon />, accent: 'bg-accent-blue-bg text-accent-blue-text' },
  { label: 'TanStack Query', sub: 'Cache and server state client ready', icon: <DatabaseIcon />, accent: 'bg-accent-yellow-bg text-accent-yellow-text' },
  { label: 'JWT Guard Ready', sub: 'Authorization interceptors active', icon: <ShieldIcon />, accent: 'bg-accent-green-bg text-accent-green-text' },
];

export const DashboardPage: React.FC = () => {
  const containerRef = useScrollReveal();

  return (
    <div ref={containerRef} className="reveal-on-scroll space-y-7 max-w-4xl">
      {/* Page header */}
      <div className="flex items-start justify-between pb-1 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl font-light text-ink tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Production-grade application shell ready for feature development.
          </p>
        </div>
        <Badge variant="neutral">Architecture Stencil</Badge>
      </div>

      {/* Bento stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} hoverEffect padding="md" className={`reveal-on-scroll stagger-${i + 1}`}>
            <CardHeader>
              <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center mb-3 ${stat.accent}`}>
                {stat.icon}
              </div>
              <CardTitle>{stat.label}</CardTitle>
              <CardDescription>{stat.sub}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 pt-1">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder section */}
      <Card padding="lg" className="border-dashed">
        <div className="text-center py-8 space-y-2">
          <p className="text-sm font-medium text-charcoal">Feature area — coming soon</p>
          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
            This section is reserved for your next feature. The architecture is ready.
          </p>
        </div>
      </Card>
    </div>
  );
};
