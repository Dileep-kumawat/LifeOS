import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  LayoutDashboard,
  Bot,
  CheckSquare,
  FolderKanban,
  Target,
  Calendar,
  Settings,
  Bell,
  Search,
  User,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'AI Assistant', icon: Bot, path: '/dashboard/ai' },
    { label: 'Tasks', icon: CheckSquare, path: '/dashboard/tasks' },
    { label: 'Projects', icon: FolderKanban, path: '/dashboard/projects' },
    { label: 'Goals', icon: Target, path: '/dashboard/goals' },
    { label: 'Calendar', icon: Calendar, path: '/dashboard/calendar' },
    { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-card border-r border-slate-800/80 flex flex-col p-4 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 px-3 py-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">LifeOS</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-300 font-bold text-xs">
              US
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Demo User</p>
              <p className="text-[10px] text-slate-400 truncate">user@lifeos.ai</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 glass-card border-b border-slate-800/80 px-6 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search LifeOS workspace..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/80"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-brand-500 absolute top-1.5 right-1.5" />
            </button>
            <button className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
