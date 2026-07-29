import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardStore } from '../store/useDashboardStore';
import { ProfileDropdown } from '../components/auth/ProfileDropdown';
import { CommandPalette } from '../components/dashboard/CommandPalette';
import { QuickCaptureModal } from '../components/dashboard/QuickCaptureModal';

// Inline SVG icons (Phosphor-style, consistent 1.5 stroke weight)
const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  ai: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  tasks: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  projects: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  goals: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
    </svg>
  ),
  bell: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
};

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const setCommandPaletteOpen = useDashboardStore((state) => state.setCommandPaletteOpen);

  const navItems = [
    { label: 'Dashboard', icon: icons.dashboard, path: '/dashboard' },
    { label: 'AI Assistant', icon: icons.ai, path: '/dashboard/ai' },
    { label: 'Tasks', icon: icons.tasks, path: '/dashboard/tasks' },
    { label: 'Projects', icon: icons.projects, path: '/dashboard/projects' },
    { label: 'Goals', icon: icons.goals, path: '/dashboard/goals' },
    { label: 'Calendar', icon: icons.calendar, path: '/dashboard/calendar' },
    { label: 'Settings', icon: icons.settings, path: '/dashboard/settings' },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex bg-canvas text-charcoal">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-bone border-r border-border">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <span className="font-serif text-base tracking-tight text-ink">LifeOS</span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5" role="navigation" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all duration-150',
                  isActive
                    ? 'bg-surface border border-border text-ink font-medium shadow-[inset_2px_0_0_0_#111111] pl-2.5'
                    : 'text-muted hover:text-charcoal hover:bg-surface/60',
                ].join(' ')}
              >
                <span className={isActive ? 'text-ink' : 'text-muted/80'}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-2">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded object-cover border border-border"
              />
            ) : (
              <div className="w-7 h-7 rounded bg-bone border border-border flex items-center justify-center text-muted font-mono text-[10px] font-medium">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink truncate">{user?.name || 'LifeOS User'}</p>
              <p className="text-[10px] text-muted truncate font-mono">{user?.email || 'user@lifeos.app'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-12 bg-surface border-b border-border px-5 flex items-center justify-between shrink-0">
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icons.search}</span>
            <input
              type="search"
              placeholder="Search workspace… (ctrl+k)"
              onClick={() => setCommandPaletteOpen(true)}
              onFocus={(e) => {
                e.target.blur();
                setCommandPaletteOpen(true);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded bg-bone border border-border text-xs text-charcoal placeholder-muted focus:outline-none focus:border-ink cursor-pointer transition-colors duration-150"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="relative w-8 h-8 flex items-center justify-center text-muted hover:text-ink hover:bg-bone border border-transparent hover:border-border rounded transition-all duration-150"
              aria-label="Notifications"
            >
              {icons.bell}
              <span className="w-1.5 h-1.5 rounded-full bg-ink absolute top-2 right-2" />
            </button>
            <ProfileDropdown />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Overlays */}
      <CommandPalette />
      <QuickCaptureModal />
    </div>
  );
};
