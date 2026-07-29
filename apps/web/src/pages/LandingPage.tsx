import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/axios';
import { SystemHealth } from '@lifeos/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToastStore } from '../store/useToastStore';

// ─── Inline SVG icons ──────────────────────────────────────────────────────
const ServerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <path d="M6 6h.01M6 18h.01" />
  </svg>
);

const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const BoxesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="9" height="9" rx="1" />
    <rect x="13" y="3" width="9" height="9" rx="1" />
    <rect x="2" y="13" width="9" height="9" rx="1" />
    <rect x="13" y="13" width="9" height="9" rx="1" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.29" />
  </svg>
);

// ─── Scroll-reveal hook ─────────────────────────────────────────────────────
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

// ─── Component ──────────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToastStore();

  const heroRef = useScrollReveal();
  const testRef = useScrollReveal();
  const healthRef = useScrollReveal();
  const archRef = useScrollReveal();

  const { data: healthData, isLoading, isError, refetch } = useQuery<SystemHealth>({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const res = await apiClient.get('/health');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const triggerToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: { title: 'State update confirmed', message: 'Zustand toast system is operating correctly.' },
      error:   { title: 'Error state captured', message: 'Simulated error notification processed by the logger.' },
      warning: { title: 'Rate threshold warning', message: 'Rate limiter threshold checked by Express security stack.' },
      info:    { title: 'Repository pattern ready', message: 'BaseRepository is configured and connected to MongoDB.' },
    };
    addToast({ type, ...messages[type] });
  };

  const pillars = [
    {
      icon: <ServerIcon />,
      accent: 'bg-accent-blue-bg text-accent-blue-text',
      tag: 'Backend',
      title: 'Clean Backend & Repository Pattern',
      description:
        'Decoupled architecture with BaseRepository abstract class, Mongoose abstraction, and a structured AppError hierarchy.',
      features: [
        'Standardized ApiResponse JSON format',
        'Zod request validation middleware',
        'Winston structured logger',
      ],
      stagger: 'stagger-1',
    },
    {
      icon: <BoxesIcon />,
      accent: 'bg-accent-yellow-bg text-accent-yellow-text',
      tag: 'Monorepo',
      title: 'Shared Workspace Packages',
      description:
        'Zero-duplication monorepo workspace sharing TypeScript DTOs, interfaces, and enums across web and API boundaries.',
      features: [
        'Shared ApiResponse and Pagination contracts',
        'User roles and SystemHealth types',
        'Strictly typed boundary payloads',
      ],
      stagger: 'stagger-2',
    },
    {
      icon: <LayersIcon />,
      accent: 'bg-accent-green-bg text-accent-green-text',
      tag: 'Frontend',
      title: 'React Web & Design System',
      description:
        'Feature-based React structure with Tailwind CSS, Zustand state stores, TanStack Query, and reusable UI primitives.',
      features: [
        'Persistent theme and auth state store',
        'Reusable Button, Input, Modal, Toast components',
        'Axios JWT interceptor client',
      ],
      stagger: 'stagger-3',
    },
  ];

  return (
    <div className="text-charcoal">
      {/* Ambient depth layer (fixed, non-scrolling) */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(47,52,55,0.04) 0%, transparent 70%)',
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center"
      >
        <div ref={heroRef} className="reveal-on-scroll space-y-7">
          <Badge variant="neutral">Scalable Monorepo Architecture</Badge>

          <h1 className="font-serif text-5xl sm:text-6xl font-light text-ink tracking-[-0.03em] leading-[1.05] max-w-3xl mx-auto">
            The production foundation<br />
            <span className="italic">for</span> LifeOS
          </h1>

          <p className="text-base text-muted max-w-xl mx-auto leading-relaxed">
            Clean Architecture powered by Node.js, Express, MongoDB, Repository Pattern,
            shared TypeScript monorepo, React, Zustand, and TanStack Query.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<TerminalIcon />}
            >
              Architecture Blueprint
            </Button>
            <a href="#health">
              <Button size="lg" variant="outline" leftIcon={<ActivityIcon />}>
                Live System Status
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-border" />
      </div>

      {/* ── Toast Test Controls ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div ref={testRef} className="reveal-on-scroll space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-light text-ink tracking-tight">
              Architecture testing controls
            </h2>
            <p className="text-sm text-muted mt-1">
              Trigger frontend Zustand state events and observe the notification system.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerToast('success')}
            >
              Success state
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerToast('info')}
            >
              Info state
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerToast('warning')}
            >
              Warning state
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerToast('error')}
            >
              Error state
            </Button>
          </div>
        </div>
      </section>

      {/* ── System Health ─────────────────────────────────────────── */}
      <section id="health" className="max-w-5xl mx-auto px-6 py-16">
        <div ref={healthRef} className="reveal-on-scroll space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-serif text-2xl font-light text-ink tracking-tight flex items-center gap-2">
                <span className="text-muted"><ActivityIcon /></span>
                Backend telemetry
              </h2>
              <p className="text-sm text-muted mt-1">
                Real-time ping of Express backend at{' '}
                <kbd className="font-mono text-xs px-1.5 py-0.5 bg-bone border border-border rounded">
                  /api/v1/health
                </kbd>
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} leftIcon={<RefreshIcon />}>
              Refresh
            </Button>
          </div>

          <Card hoverEffect={false} className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-[8px] overflow-hidden p-0">
            {[
              {
                label: 'Backend Status',
                value: isLoading ? (
                  <Badge variant="warning">Checking</Badge>
                ) : isError ? (
                  <Badge variant="error">Offline</Badge>
                ) : (
                  <Badge variant="success">Online</Badge>
                ),
              },
              {
                label: 'MongoDB',
                value: (
                  <span className="font-mono text-sm font-medium text-ink">
                    {healthData?.database.status
                      ? healthData.database.status.toUpperCase()
                      : 'DISCONNECTED'}
                  </span>
                ),
              },
              {
                label: 'Uptime',
                value: (
                  <span className="font-mono text-sm font-medium text-ink">
                    {healthData?.uptimeSeconds ? `${healthData.uptimeSeconds}s` : 'N/A'}
                  </span>
                ),
              },
              {
                label: 'Heap Used',
                value: (
                  <span className="font-mono text-sm font-medium text-ink">
                    {healthData?.memoryUsage ? healthData.memoryUsage.heapUsed : 'N/A'}
                  </span>
                ),
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted font-medium mb-2">
                  {stat.label}
                </p>
                <div>{stat.value}</div>
              </div>
            ))}
          </Card>
        </div>
      </section>

      {/* ── Architectural Pillars ─────────────────────────────────── */}
      <section id="architecture" className="max-w-5xl mx-auto px-6 py-16 section-depth">
        <div ref={archRef} className="reveal-on-scroll space-y-8">
          <div>
            <Badge variant="neutral" className="mb-4">Technical foundations</Badge>
            <h2 className="font-serif text-3xl font-light text-ink tracking-[-0.02em]">
              Enterprise architectural pillars
            </h2>
          </div>

          {/* Asymmetric bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pillars.map((pillar) => (
              <Card
                key={pillar.title}
                hoverEffect
                padding="lg"
                className={`reveal-on-scroll ${pillar.stagger}`}
              >
                <CardHeader>
                  <div className={`w-9 h-9 rounded-[6px] flex items-center justify-center mb-4 ${pillar.accent}`}>
                    {pillar.icon}
                  </div>
                  <Badge variant="neutral" className="mb-2">{pillar.tag}</Badge>
                  <CardTitle>{pillar.title}</CardTitle>
                  <CardDescription>{pillar.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 pt-1">
                    {pillar.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted">
                        <span className="mt-0.5 shrink-0 text-charcoal">
                          <CheckIcon />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture Modal ────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="LifeOS Architecture Blueprint"
        description="Verified production SaaS foundation setup"
      >
        <div className="space-y-4 text-sm text-charcoal">
          <p className="leading-relaxed">
            This LifeOS monorepo is initialized with production-grade architecture patterns
            ready for feature development.
          </p>

          {/* Faux OS terminal window */}
          <div className="rounded-[8px] border border-border overflow-hidden">
            <div className="bg-bone border-b border-border px-3 py-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
              <span className="ml-2 text-[11px] font-mono text-muted">lifeos — architecture</span>
            </div>
            <div className="bg-surface px-4 py-4 font-mono text-xs space-y-1.5">
              {[
                'Express 4 + TypeScript + Mongoose',
                'Repository Pattern (BaseRepository)',
                'Swagger OpenAPI UI (/api-docs)',
                'React 18 + Vite + Tailwind CSS',
                'Docker Compose orchestration',
              ].map((line) => (
                <p key={line} className="flex items-start gap-2 text-charcoal">
                  <span className="text-accent-green-text shrink-0 mt-px">
                    <CheckIcon />
                  </span>
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" variant="primary" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
