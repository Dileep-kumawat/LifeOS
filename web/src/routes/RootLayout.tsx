import { Outlet, Link, NavLink } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/authStore";
import { NotificationBell } from "../features/notifications";

export function RootLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? "text-[#0075de] font-semibold" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            LifeOS
          </Link>
          <nav className="flex items-center gap-4">
            <NavLink to="/calendar" className={getNavLinkClass}>
              Calendar
            </NavLink>
            <NavLink to="/goals" className={getNavLinkClass}>
              Goals
            </NavLink>
            <NavLink to="/habits" className={getNavLinkClass}>
              Habits
            </NavLink>
            <NavLink to="/notes" className={getNavLinkClass}>
              Notes
            </NavLink>
            <NavLink to="/finance" className={getNavLinkClass}>
              Finance & Budget
            </NavLink>
            <NavLink to="/chat" className={getNavLinkClass}>
              AI Chat
            </NavLink>
            <NavLink to="/settings" className={getNavLinkClass}>
              Settings
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? <NotificationBell /> : <Button variant="secondary">Sign in</Button>}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
