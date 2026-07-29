import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '@lifeos/shared';

// Inline SVG icons
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LogOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const roleConfig: Record<string, { bg: string; text: string }> = {
  [UserRole.ADMIN]:   { bg: 'bg-accent-red-bg',    text: 'text-accent-red-text' },
  [UserRole.PREMIUM]: { bg: 'bg-accent-yellow-bg', text: 'text-accent-yellow-text' },
  [UserRole.USER]:    { bg: 'bg-bone',              text: 'text-muted' },
};

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
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const role = user?.role || UserRole.USER;
  const rc = roleConfig[role] ?? roleConfig[UserRole.USER];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="profile-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded border border-transparent hover:border-border hover:bg-bone transition-all duration-150 focus:outline-none"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-6 h-6 rounded object-cover border border-border"
          />
        ) : (
          <div className="w-6 h-6 rounded bg-bone border border-border flex items-center justify-center text-muted font-mono text-[10px] font-medium">
            {getInitials(user?.name)}
          </div>
        )}
        <span className="text-xs font-medium text-charcoal hidden sm:block">{user?.name || 'User'}</span>
        <span className="text-muted">
          <ChevronDownIcon open={isOpen} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 bg-surface border border-border rounded-[10px] shadow-editorial-md p-1.5 z-50">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border mb-1">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-xs font-medium text-ink truncate">{user?.name || 'LifeOS User'}</p>
              <span className={`text-[9px] uppercase font-medium tracking-[0.06em] px-1.5 py-0.5 rounded-full border border-border ${rc.bg} ${rc.text}`}>
                {role}
              </span>
            </div>
            <p className="text-[11px] text-muted truncate font-mono">{user?.email}</p>
            {user?.authProvider === 'google' && (
              <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Connected via Google
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="space-y-0.5">
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded text-xs text-charcoal hover:text-ink hover:bg-bone transition-colors duration-100"
            >
              <span className="text-muted"><UserIcon /></span>
              Profile Settings
            </Link>

            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded text-xs text-charcoal hover:text-ink hover:bg-bone transition-colors duration-100"
            >
              <span className="text-muted"><SettingsIcon /></span>
              Account &amp; Security
            </Link>

            {user?.role === UserRole.ADMIN && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded text-xs text-accent-red-text hover:bg-accent-red-bg cursor-pointer transition-colors duration-100">
                <ShieldIcon /> Admin Console
              </div>
            )}
          </div>

          <div className="border-t border-border mt-1 pt-1">
            <button
              id="logout-button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium text-accent-red-text hover:bg-accent-red-bg transition-colors duration-100 text-left"
            >
              <LogOutIcon /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
