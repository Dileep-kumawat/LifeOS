import { Outlet, Link } from "react-router-dom";
import { Button } from "../components/Button";

// Minimal shell for Phase 0. Real navigation (Calendar/Goals/Habits/Notes/
// Chat) gets added as those modules land from Phase 1 onward.
export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          LifeOS
        </Link>
        <Button variant="secondary">Sign in</Button>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
