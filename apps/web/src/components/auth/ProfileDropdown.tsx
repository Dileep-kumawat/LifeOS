import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { User, LogOut, Settings, ShieldCheck, ChevronDown } from 'lucide-react';
import { UserRole } from '@lifeos/shared';

export const ProfileDropdown: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const roleColors: Record<string, string> = {
    [UserRole.ADMIN]: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    [UserRole.PREMIUM]: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    [UserRole.USER]: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="profile-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 transition-all duration-200 focus:outline-none"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-7 h-7 rounded-full object-cover border border-slate-700"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/50 flex items-center justify-center text-brand-300 font-bold text-xs">
            {getInitials(user?.name)}
          </div>
        )}

        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-slate-100 leading-none">{user?.name || 'User'}</p>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 glass-card rounded-2xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header section */}
          <div className="p-3 border-b border-slate-800/80 mb-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-slate-100 truncate">{user?.name || 'LifeOS User'}</p>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${roleColors[user?.role || UserRole.USER]}`}>
                {user?.role || 'User'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            {user?.authProvider === 'google' && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connected via Google
              </div>
            )}
          </div>

          {/* Links */}
          <div className="space-y-0.5">
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" /> Profile Settings
            </Link>

            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" /> Account & Security
            </Link>

            {user?.role === UserRole.ADMIN && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-500/10 cursor-pointer">
                <ShieldCheck className="w-4 h-4 text-rose-400" /> Admin Console
              </div>
            )}
          </div>

          <div className="pt-1 mt-1 border-t border-slate-800/80">
            <button
              id="logout-button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
