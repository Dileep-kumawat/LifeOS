import { Outlet, Link } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/authStore";
import { NotificationBell } from "../features/notifications";

// Minimal shell for Phase 0. Real navigation (Calendar/Goals/Habits/Notes/
// Chat) gets added as those modules land from Phase 1 onward.
export function RootLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            LifeOS
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/calendar"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Calendar
            </Link>
            <Link
              to="/goals"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Goals
            </Link>
            <Link
              to="/habits"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Habits
            </Link>
            <Link
              to="/notes"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Notes
            </Link>
            <Link
              to="/chat"
              className="text-sm font-semibold text-[#0075de] transition-colors hover:text-[#005bab]"
            >
              AI Chat
            </Link>
            <Link
              to="/settings"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Settings
            </Link>
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
