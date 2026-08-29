import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { queryClient } from "./lib/queryClient";
import { refreshAccessToken } from "./lib/apiClient";
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
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { StudyPage } from "./features/study/StudyPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardPage />
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
        path: "study",
        element: (
          <ProtectedRoute>
            <StudyPage />
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
  useEffect(() => {
    // Deduplicated session restore on app boot
    refreshAccessToken();
  }, []);

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
