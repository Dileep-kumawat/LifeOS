import React, { useEffect, useRef } from 'react';
import { useDashboardSummary } from '../hooks/useDashboard';
import { TodaySummaryWidget } from '../components/dashboard/TodaySummaryWidget';
import { QuickActionsWidget } from '../components/dashboard/QuickActionsWidget';
import { UpcomingTasksWidget } from '../components/dashboard/UpcomingTasksWidget';
import { UpcomingEventsWidget } from '../components/dashboard/UpcomingEventsWidget';
import { HabitsOverviewWidget } from '../components/dashboard/HabitsOverviewWidget';
import { RecentNotesWidget } from '../components/dashboard/RecentNotesWidget';
import { StatisticsWidget } from '../components/dashboard/StatisticsWidget';
import { ProductivitySnapshot } from '../components/dashboard/ProductivitySnapshot';
import { FavoritesWidget } from '../components/dashboard/FavoritesWidget';
import { NotificationsWidget } from '../components/dashboard/NotificationsWidget';
import { RecentActivityTimeline } from '../components/dashboard/RecentActivityTimeline';

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
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export const DashboardPage: React.FC = () => {
  const containerRef = useScrollReveal();
  const { data: summaryResponse, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();

  const summary = summaryResponse?.data;

  return (
    <div ref={containerRef} className="reveal-on-scroll space-y-8 max-w-7xl mx-auto pb-12">
      {/* Editorial Header */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-3xl font-light text-ink tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-muted mt-1 font-mono">
            Command Center · Active Session Secured
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono bg-bone border border-border px-2.5 py-1 rounded text-muted uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green-text animate-pulse" />
          Synchronized
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Row 1: Greeting + Action shortcuts */}
        <div className="lg:col-span-2 reveal-on-scroll stagger-1">
          <TodaySummaryWidget summary={summary} isLoading={summaryLoading} error={summaryError} />
        </div>
        <div className="reveal-on-scroll stagger-1">
          <QuickActionsWidget />
        </div>

        {/* Row 2: Standard checklist elements */}
        <div className="reveal-on-scroll stagger-2">
          <UpcomingTasksWidget />
        </div>
        <div className="reveal-on-scroll stagger-2">
          <UpcomingEventsWidget />
        </div>
        <div className="reveal-on-scroll stagger-2">
          <HabitsOverviewWidget />
        </div>

        {/* Row 3: Analytics & content previews */}
        <div className="reveal-on-scroll stagger-3">
          <RecentNotesWidget />
        </div>
        <div className="reveal-on-scroll stagger-3">
          <StatisticsWidget />
        </div>
        <div className="reveal-on-scroll stagger-3">
          <ProductivitySnapshot />
        </div>

        {/* Row 4: Shortcuts, feed logs, and alerts */}
        <div className="reveal-on-scroll stagger-4">
          <FavoritesWidget />
        </div>
        <div className="reveal-on-scroll stagger-4">
          <NotificationsWidget />
        </div>
        <div className="reveal-on-scroll stagger-4">
          <RecentActivityTimeline />
        </div>
      </div>
    </div>
  );
};
