import React, { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';

export const PublicLayout: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-canvas/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2">
            <span className="font-serif text-lg tracking-tight text-ink leading-none">LifeOS</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-muted border border-border rounded px-1.5 py-0.5">
              v2.0
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted">
            <a
              href="#features"
              className="hover:text-ink transition-colors duration-150"
            >
              Features
            </a>
            <a
              href="#architecture"
              className="hover:text-ink transition-colors duration-150"
            >
              Architecture
            </a>
            <a
              href="#health"
              className="hover:text-ink transition-colors duration-150"
            >
              System Status
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink hover:bg-bone border border-transparent hover:border-border rounded transition-all duration-150"
            >
              {theme === 'dark' ? (
                /* Sun icon */
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                /* Moon icon */
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
                </svg>
              )}
            </button>

            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm" variant="primary">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button size="sm" variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="primary">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-7 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">
            © 2026 LifeOS. Built with React, TypeScript, Vite, Express &amp; MongoDB.
          </p>
          <div className="flex gap-5">
            <a
              href="/api-docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted hover:text-ink transition-colors"
            >
              OpenAPI Spec
              <svg className="inline ml-1 w-3 h-3 opacity-60" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
