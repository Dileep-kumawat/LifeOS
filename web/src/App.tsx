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
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useAuthStore } from "./store/authStore";

function DashboardHome() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-4 p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-[#000000]">Welcome back, {user?.name || "User"}!</h1>
      <p className="text-sm text-[#615d59]">
        LifeOS Phase 1 MVP Core — Authentication, Calendar, Goals & Habits modules active.
      </p>
      <div className="flex gap-4">
        <Link
          to="/goals"
          className="inline-flex items-center justify-center rounded-lg bg-[#0075de] text-white px-4 py-2 text-sm font-medium hover:bg-[#005bab]"
        >
          View Goals
        </Link>
        <Link
          to="/habits"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
        >
          View Habits
        </Link>
        <Link
          to="/notes"
          className="inline-flex items-center justify-center rounded-lg bg-[#000000] text-white px-4 py-2 text-sm font-medium hover:bg-[#31302e]"
        >
          View Notes
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

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
