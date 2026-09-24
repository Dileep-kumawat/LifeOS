import { useEffect, lazy, Suspense } from "react";
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
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RouteLoadingFallback } from "./components/ui/RouteLoadingFallback";

// Route-split lazy-loaded features
const NoteDetailPage = lazy(() =>
  import("./features/notes/NoteDetailPage").then((m) => ({ default: m.NoteDetailPage }))
);
const NotesListPage = lazy(() =>
  import("./features/notes/NotesListPage").then((m) => ({ default: m.NotesListPage }))
);
const AnalyticsPage = lazy(() =>
  import("./features/analytics/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage }))
);
const ReceiptScanPage = lazy(() =>
  import("./features/finance/ReceiptScanPage").then((m) => ({ default: m.ReceiptScanPage }))
);
const FinancePage = lazy(() =>
  import("./features/finance/FinancePage").then((m) => ({ default: m.FinancePage }))
);
const CalendarPage = lazy(() =>
  import("./features/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage }))
);
const GoalListPage = lazy(() =>
  import("./features/goals/GoalListPage").then((m) => ({ default: m.GoalListPage }))
);
const GoalDetailPage = lazy(() =>
  import("./features/goals/GoalDetailPage").then((m) => ({ default: m.GoalDetailPage }))
);
const HabitListPage = lazy(() =>
  import("./features/habits/HabitListPage").then((m) => ({ default: m.HabitListPage }))
);
const HabitDetailPage = lazy(() =>
  import("./features/habits/HabitDetailPage").then((m) => ({ default: m.HabitDetailPage }))
);
const StudyPage = lazy(() =>
  import("./features/study/StudyPage").then((m) => ({ default: m.StudyPage }))
);
const FocusPage = lazy(() =>
  import("./features/focus/FocusPage").then((m) => ({ default: m.FocusPage }))
);
const ChatPage = lazy(() =>
  import("./features/ai/ChatPage").then((m) => ({ default: m.ChatPage }))
);
const SettingsPage = lazy(() =>
  import("./routes/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const SupportHelpPage = lazy(() =>
  import("./routes/SupportHelpPage").then((m) => ({ default: m.SupportHelpPage }))
);
const DownloadAppPage = lazy(() =>
  import("./routes/DownloadAppPage").then((m) => ({ default: m.DownloadAppPage }))
);


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
            <Suspense fallback={<RouteLoadingFallback />}>
              <FinancePage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "finance/scan",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback variant="scan" />}>
              <ReceiptScanPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "calendar",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <CalendarPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "goals",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <GoalListPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "goals/:id",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <GoalDetailPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "habits",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <HabitListPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "habits/:id",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <HabitDetailPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "notes",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <NotesListPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "notes/:id",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback variant="editor" />}>
              <NoteDetailPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "study",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <StudyPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "focus",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <FocusPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback variant="analytics" />}>
              <AnalyticsPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "chat",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <ChatPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "support",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <SupportHelpPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "help",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <SupportHelpPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "download",
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <DownloadAppPage />
          </Suspense>
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
