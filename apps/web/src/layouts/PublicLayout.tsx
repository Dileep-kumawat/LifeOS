import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useThemeStore } from '../store/useThemeStore';
import { Sun, Moon, Sparkles, Layers, Cpu, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const PublicLayout: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold gradient-text tracking-wider">LifeOS</span>
              <span className="ml-2 text-[10px] font-semibold bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/30 uppercase tracking-widest">
                v2.0 Native Architecture
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-400" /> Features
            </a>
            <a href="#architecture" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" /> Architecture
            </a>
            <a href="#health" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> System Status
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link to="/dashboard">
              <Button size="sm" variant="primary">
                Open App Shell
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 LifeOS. Built with React, TypeScript, Vite, Express & MongoDB.</p>
          <div className="flex gap-4">
            <a href="/api-docs" target="_blank" rel="noreferrer" className="hover:text-brand-400 transition-colors">
              OpenAPI / Swagger Specs ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
