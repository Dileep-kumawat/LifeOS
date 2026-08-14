import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Flag,
  Wallet,
  FileText,
  Calendar as CalendarIcon,
  Bot,
  HelpCircle,
  Archive,
  Settings
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { NotificationBell } from "../features/notifications";
import { cn } from "../lib/utils";

export function RootLayout() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isChat = location.pathname.startsWith("/chat");

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "text-[#005db2] font-bold border-r-4 border-[#005db2] bg-[#0075de]/10"
        : "text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7]"
    }`;

  return (
    <div className="min-h-screen bg-[#f6f5f4] flex">
      {/* ─── SideNavBar (Desktop Docked Sidebar) ────────────────────────── */}
      <nav className="hidden lg:flex flex-col h-screen fixed left-0 top-0 pt-6 pb-6 bg-[#faf9f8] border-r border-[#c1c6d5] w-64 z-40">
        {/* App Title Anchor */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h1 className="text-xl font-bold text-[#005db2] tracking-tight">LifeOS Executive</h1>
            <p className="text-xs text-[#414753] mt-1">
              Good morning, {user?.name || "Explorer"}
            </p>
          </div>
          <NotificationBell align="start" />
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col gap-1.5 px-3">
          <NavLink to="/" end className={getNavLinkClass}>
            <LayoutDashboard className="size-5 shrink-0" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/calendar" className={getNavLinkClass}>
            <CalendarIcon className="size-5 shrink-0" />
            <span>Calendar</span>
          </NavLink>
          <NavLink to="/habits" className={getNavLinkClass}>
            <CheckSquare className="size-5 shrink-0" />
            <span>Habits</span>
          </NavLink>
          <NavLink to="/goals" className={getNavLinkClass}>
            <Flag className="size-5 shrink-0" />
            <span>Goals</span>
          </NavLink>
          <NavLink to="/finance" className={getNavLinkClass}>
            <Wallet className="size-5 shrink-0" />
            <span>Finance</span>
          </NavLink>
          <NavLink to="/notes" className={getNavLinkClass}>
            <FileText className="size-5 shrink-0" />
            <span>Notes</span>
          </NavLink>
        </div>

        {/* CTA & Footer */}
        <div className="px-4 mt-auto space-y-4">
          <NavLink
            to="/chat"
            className="w-full bg-[#005db2] text-white py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#00468a] transition-colors shadow-xs"
          >
            <Bot className="size-4" />
            AI Assistant
          </NavLink>
          <div className="border-t border-[#c1c6d5]/60 pt-4 flex flex-col gap-1">
            <NavLink
              to="/settings"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] transition-all"
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </NavLink>
            <NavLink
              to="/chat"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] transition-all"
            >
              <HelpCircle className="size-4" />
              <span>Support & Help</span>
            </NavLink>
            <NavLink
              to="/notes"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] transition-all"
            >
              <Archive className="size-4" />
              <span>Archive</span>
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ─── BottomNavBar (Mobile Shared Nav) ───────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-[#faf9f8] border-t border-[#c1c6d5] shadow-md rounded-t-xl">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-xl px-3 py-1.5 text-xs transition-colors ${
              isActive ? "bg-[#0075de] text-white font-bold" : "text-[#414753] hover:bg-[#e3e2e1]"
            }`
          }
        >
          <LayoutDashboard className="size-4" />
          <span className="text-[10px] mt-0.5">Home</span>
        </NavLink>
        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-xl px-3 py-1.5 text-xs transition-colors ${
              isActive ? "bg-[#0075de] text-white font-bold" : "text-[#414753] hover:bg-[#e3e2e1]"
            }`
          }
        >
          <CalendarIcon className="size-4" />
          <span className="text-[10px] mt-0.5">Schedule</span>
        </NavLink>
        <NavLink
          to="/habits"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-xl px-3 py-1.5 text-xs transition-colors ${
              isActive ? "bg-[#0075de] text-white font-bold" : "text-[#414753] hover:bg-[#e3e2e1]"
            }`
          }
        >
          <CheckSquare className="size-4" />
          <span className="text-[10px] mt-0.5">Habits</span>
        </NavLink>
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-xl px-3 py-1.5 text-xs transition-colors ${
              isActive ? "bg-[#0075de] text-white font-bold" : "text-[#414753] hover:bg-[#e3e2e1]"
            }`
          }
        >
          <Bot className="size-4" />
          <span className="text-[10px] mt-0.5">AI</span>
        </NavLink>
      </nav>

      {/* ─── Main Canvas ────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 lg:ml-64 flex flex-col min-w-0",
          isChat
            ? "h-screen pb-16 lg:pb-0 overflow-hidden"
            : "min-h-screen pb-24 lg:pb-12"
        )}
      >
        {/* Content Outlet */}
        <main className={cn("w-full flex-1 flex flex-col min-w-0", isChat && "h-full min-h-0 overflow-hidden")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}


