import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom";
import { Toaster } from "sonner";
import axios from "axios";
import { queryClient } from "./lib/queryClient";
import { RootLayout } from "./routes/RootLayout";
import { LoginPage } from "./routes/LoginPage";
import { RegisterPage } from "./routes/RegisterPage";
import { ForgotPasswordPage } from "./routes/ForgotPasswordPage";
import { ResetPasswordPage } from "./routes/ResetPasswordPage";
import { SettingsPage } from "./routes/SettingsPage";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { GoalListPage } from "./features/goals/GoalListPage";
import { GoalDetailPage } from "./features/goals/GoalDetailPage";
import { HabitListPage } from "./features/habits/HabitListPage";
import { HabitDetailPage } from "./features/habits/HabitDetailPage";
import { NotesListPage } from "./features/notes/NotesListPage";
import { NoteDetailPage } from "./features/notes/NoteDetailPage";
import { ChatPage } from "./features/ai/ChatPage";
import { FinancePage } from "./features/finance/FinancePage";
import { DailySummaryCard } from "./features/ai/components/DailySummaryCard";
import { useTodaySummary } from "./features/ai/hooks/useDailySummary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useAuthStore } from "./store/authStore";

function DashboardHome() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError, refetch } = useTodaySummary();

  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.name || "User"}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          LifeOS Core — Calendar, Goals, Habits, Notes, Finance & AI Daily Summary active.
        </p>
      </div>

      <DailySummaryCard
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        generated={data?.generated}
        deliveryTime={data?.deliveryTime}
        summary={data?.summary}
      />

      <div className="flex flex-wrap gap-4">
        <Link
          to="/finance"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Finance & Budget
        </Link>
        <Link
          to="/goals"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          View Goals
        </Link>
        <Link
          to="/habits"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          View Habits
        </Link>
        <Link
          to="/notes"
          className="inline-flex items-center justify-center rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          View Notes
        </Link>
        <Link
          to="/chat"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          AI Chat
        </Link>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardHome />
          </ProtectedRoute>
        )
      },
      {
        path: "finance",
        element: (
          <ProtectedRoute>
            <FinancePage />
          </ProtectedRoute>
        )
      },
      {
        path: "calendar",
        element: (
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        )
      },
      {
        path: "goals",
        element: (
          <ProtectedRoute>
            <GoalListPage />
          </ProtectedRoute>
        )
      },
      {
        path: "goals/:id",
        element: (
          <ProtectedRoute>
            <GoalDetailPage />
          </ProtectedRoute>
        )
      },
      {
        path: "habits",
        element: (
          <ProtectedRoute>
            <HabitListPage />
          </ProtectedRoute>
        )
      },
      {
        path: "habits/:id",
        element: (
          <ProtectedRoute>
            <HabitDetailPage />
          </ProtectedRoute>
        )
      },
      {
        path: "notes",
        element: (
          <ProtectedRoute>
            <NotesListPage />
          </ProtectedRoute>
        )
      },
      {
        path: "notes/:id",
        element: (
          <ProtectedRoute>
            <NoteDetailPage />
          </ProtectedRoute>
        )
      },
      {
        path: "chat",
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        )
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        )
      }
    ]
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password/:token", element: <ResetPasswordPage /> }
]);

export function App() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    // Silent session restore attempt on app boot
    async function restoreSession() {
      try {
        const response = await axios.post("/api/v1/auth/refresh", {}, { withCredentials: true });
        const { user, accessToken } = response.data;
        setAuth(user, accessToken);
      } catch (_err) {
        clearAuth();
      }
    }
    restoreSession();
  }, [setAuth, clearAuth]);

  // Register the service worker for web-push receipt. Registration alone never
  // triggers a permission prompt — the push opt-in gate lives in the
  // PushOptInCard flow, which only calls the permission API on an explicit click.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* push is opt-in and not required for the app to work */
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
