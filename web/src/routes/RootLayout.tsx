import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
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
  Settings,
  Menu,
  X,
  LogOut,
  GraduationCap,
  Timer,
  BarChart3
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/apiClient";
import { NotificationBell } from "../features/notifications";
import { cn } from "../lib/utils";

export function RootLayout() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const location = useLocation();
  const navigate = useNavigate();
  const isChat = location.pathname.startsWith("/chat");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileDrawerOpen]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
      isActive
        ? "text-[#005db2] font-bold border-r-4 border-[#005db2] bg-[#0075de]/10 shadow-2xs"
        : "text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] hover:translate-x-0.5"
    }`;

  const getDrawerNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
      isActive
        ? "text-[#005db2] font-bold bg-[#0075de]/10 shadow-2xs"
        : "text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] hover:translate-x-0.5"
    }`;

  return (
    <div
      className={cn(
        "bg-[#f6f5f4] flex flex-col lg:flex-row w-full",
        isChat ? "h-full overflow-hidden" : "min-h-screen"
      )}
    >
      {/* ─── Mobile / Tablet Top Header (<lg) ────────────────────────────── */}
      {!isChat && (
        <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#faf9f8]/95 backdrop-blur-md border-b border-[#c1c6d5] px-4 flex items-center justify-between z-40 transition-all duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-1.5 -ml-1 text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] rounded-lg transition-all duration-150 active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </button>
            <NavLink
              to="/"
              className="flex items-center gap-2 min-w-0 transition-transform duration-150 active:scale-95"
            >
              <span className="font-bold text-base text-[#005db2] tracking-tight truncate">
                LifeOS
              </span>
            </NavLink>
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell align="end" />
            <NavLink
              to="/chat"
              className="p-2 text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] rounded-lg transition-all duration-150 active:scale-95"
              aria-label="AI Assistant"
            >
              <Bot className="size-5" />
            </NavLink>
          </div>
        </header>
      )}

      {/* ─── Mobile Slide-out Drawer (<lg) ───────────────────────────────── */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-[#faf9f8] h-full shadow-2xl z-50 flex flex-col p-5 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#c1c6d5]/60">
              <div>
                <h2 className="text-lg font-bold text-[#005db2] tracking-tight">
                  LifeOS Executive
                </h2>
                <p className="text-xs text-[#414753] mt-0.5 truncate">
                  {user?.name ? `Hi, ${user.name}` : "Executive Hub"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-[#414753] hover:text-[#1a1c1c] hover:bg-[#e9e8e7] rounded-lg transition-all duration-150 active:scale-95"
                aria-label="Close navigation menu"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Navigation Links List */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#717784] px-3 uppercase tracking-wider mb-1">
                Navigation
              </span>
              <NavLink to="/" end className={getDrawerNavLinkClass}>
                <LayoutDashboard className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/calendar" className={getDrawerNavLinkClass}>
                <CalendarIcon className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span>Calendar</span>
              </NavLink>
              <NavLink to="/habits" className={getDrawerNavLinkClass}>
                <CheckSquare className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span>Habits</span>
              </NavLink>
              <NavLink to="/goals" className={getDrawerNavLinkClass}>
                <Flag className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span>Goals</span>
              </NavLink>
              <NavLink to="/finance" className={getDrawerNavLinkClass}>
                <Wallet className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span>Finance</span>
              </NavLink>
              <NavLink to="/notes" className={getDrawerNavLinkClass}>
                <FileText className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span>Notes</span>
              </NavLink>
              <NavLink to="/study" className={getDrawerNavLinkClass}>
                <GraduationCap className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span>Study</span>
              </NavLink>
              <NavLink to="/focus" className={getDrawerNavLinkClass}>
                <Timer className="size-4 shrink-0 text-[#0075de] transition-transform duration-150 group-hover:scale-110" />
                <span>Focus</span>
              </NavLink>
              <NavLink to="/analytics" className={getDrawerNavLinkClass}>
                <BarChart3 className="size-4 shrink-0 text-[#0075de] transition-transform duration-150 group-hover:scale-110" />
                <span>Analytics</span>
              </NavLink>

              <div className="border-t border-[#c1c6d5]/60 my-2 pt-2">
                <span className="text-[11px] font-semibold text-[#717784] px-3 uppercase tracking-wider mb-1">
                  Tools & Account
                </span>
                <NavLink to="/chat" className={getDrawerNavLinkClass}>
                  <Bot className="size-4 shrink-0 text-[#005db2] transition-transform duration-150 group-hover:scale-110 animate-float-subtle" />
                  <span className="font-semibold text-[#005db2]">AI Assistant</span>
                </NavLink>
                <NavLink to="/settings" className={getDrawerNavLinkClass}>
                  <Settings className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                  <span>Settings</span>
                </NavLink>
                <NavLink to="/chat" className={getDrawerNavLinkClass}>
                  <HelpCircle className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                  <span>Support & Help</span>
                </NavLink>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-[#c1c6d5]/60 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-[#1a1c1c] truncate">
                  {user?.email || "User"}
                </p>
                <span className="text-[10px] text-[#717784] uppercase">
                  {user?.role || "Member"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-150 active:scale-95"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SideNavBar (Desktop Docked Sidebar) ────────────────────────── */}
      <nav className="hidden lg:flex flex-col h-screen fixed left-0 top-0 pt-6 pb-6 bg-[#faf9f8] border-r border-[#c1c6d5] w-64 z-40">
        {/* App Title Anchor */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h1 className="text-xl font-bold text-[#005db2] tracking-tight hover:opacity-90 transition-opacity">
              LifeOS Executive
            </h1>
            <p className="text-xs text-[#414753] mt-1">Good morning, {user?.name || "Explorer"}</p>
          </div>
          <NotificationBell align="start" />
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col gap-1.5 px-3">
          <NavLink to="/" end className={getNavLinkClass}>
            <LayoutDashboard className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/calendar" className={getNavLinkClass}>
            <CalendarIcon className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Calendar</span>
          </NavLink>
          <NavLink to="/habits" className={getNavLinkClass}>
            <CheckSquare className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Habits</span>
          </NavLink>
          <NavLink to="/goals" className={getNavLinkClass}>
            <Flag className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Goals</span>
          </NavLink>
          <NavLink to="/finance" className={getNavLinkClass}>
            <Wallet className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Finance</span>
          </NavLink>
          <NavLink to="/notes" className={getNavLinkClass}>
            <FileText className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Notes</span>
          </NavLink>
          <NavLink to="/study" className={getNavLinkClass}>
            <GraduationCap className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Study</span>
          </NavLink>
          <NavLink to="/focus" className={getNavLinkClass}>
            <Timer className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Focus</span>
          </NavLink>
          <NavLink to="/analytics" className={getNavLinkClass}>
            <BarChart3 className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span>Analytics</span>
          </NavLink>
        </div>

        {/* CTA & Footer */}
        <div className="px-4 mt-auto space-y-4">
          <NavLink
            to="/chat"
            className="w-full bg-[#005db2] text-white py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#00468a] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150 shadow-xs group"
          >
            <Bot className="size-4 transition-transform duration-200 group-hover:scale-115 animate-float-subtle" />
            AI Assistant
          </NavLink>
          <div className="border-t border-[#c1c6d5]/60 pt-4 flex flex-col gap-1">
            <NavLink
              to="/settings"
              className="group flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] hover:translate-x-0.5 active:scale-[0.98] transition-all duration-150"
            >
              <Settings className="size-4 transition-transform duration-150 group-hover:rotate-45" />
              <span>Settings</span>
            </NavLink>
            <NavLink
              to="/chat"
              className="group flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] hover:translate-x-0.5 active:scale-[0.98] transition-all duration-150"
            >
              <HelpCircle className="size-4 transition-transform duration-150 group-hover:scale-110" />
              <span>Support & Help</span>
            </NavLink>
            <NavLink
              to="/notes"
              className="group flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-[#414753] hover:text-[#005db2] hover:bg-[#e9e8e7] hover:translate-x-0.5 active:scale-[0.98] transition-all duration-150"
            >
              <Archive className="size-4 transition-transform duration-150 group-hover:scale-110" />
              <span>Archive</span>
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ─── BottomNavBar (Mobile 5-item Shared Nav) ────────────────────── */}
      {!isChat && (
        <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-2 py-1.5 bg-[#faf9f8]/95 backdrop-blur-md border-t border-[#c1c6d5] shadow-lg">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs transition-all duration-150 active:scale-90 min-w-[54px] ${
                isActive
                  ? "bg-[#0075de] text-white font-bold shadow-xs scale-105"
                  : "text-[#414753] hover:bg-[#e3e2e1]"
              }`
            }
          >
            <LayoutDashboard className="size-4" />
            <span className="text-[10px] mt-0.5">Home</span>
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs transition-all duration-150 active:scale-90 min-w-[54px] ${
                isActive
                  ? "bg-[#0075de] text-white font-bold shadow-xs scale-105"
                  : "text-[#414753] hover:bg-[#e3e2e1]"
              }`
            }
          >
            <CalendarIcon className="size-4" />
            <span className="text-[10px] mt-0.5">Schedule</span>
          </NavLink>
          <NavLink
            to="/habits"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs transition-all duration-150 active:scale-90 min-w-[54px] ${
                isActive
                  ? "bg-[#0075de] text-white font-bold shadow-xs scale-105"
                  : "text-[#414753] hover:bg-[#e3e2e1]"
              }`
            }
          >
            <CheckSquare className="size-4" />
            <span className="text-[10px] mt-0.5">Habits</span>
          </NavLink>
          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs transition-all duration-150 active:scale-90 min-w-[54px] ${
                isActive
                  ? "bg-[#0075de] text-white font-bold shadow-xs scale-105"
                  : "text-[#414753] hover:bg-[#e3e2e1]"
              }`
            }
          >
            <FileText className="size-4" />
            <span className="text-[10px] mt-0.5">Notes</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs text-[#414753] hover:bg-[#e3e2e1] active:scale-90 transition-all duration-150 min-w-[54px]"
          >
            <Menu className="size-4" />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </nav>
      )}

      {/* ─── Main Canvas ────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 lg:ml-64 flex flex-col min-w-0",
          isChat
            ? "h-full p-0 overflow-hidden"
            : "min-h-[calc(100vh-3.5rem)] lg:min-h-screen pt-14 lg:pt-0 pb-20 lg:pb-12"
        )}
      >
        {/* Content Outlet */}
        <main
          className={cn(
            "w-full flex-1 flex flex-col min-w-0",
            isChat ? "h-full min-h-0 overflow-hidden" : ""
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
