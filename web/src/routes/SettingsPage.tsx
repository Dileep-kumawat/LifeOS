import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/apiClient";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { DeleteAccountDialog } from "../components/auth/DeleteAccountDialog";
import { NotificationPreferencesPanel } from "../features/notifications";

export function SettingsPage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiClient.delete("/auth/account");
      toast.info("Account scheduled for deletion. Permanently purged in 30 days.");
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f5f4] p-4 sm:p-6 flex flex-col items-center w-full">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-[#000000]">Account Settings</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account identity details</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#615d59]">Full Name</span>
              <span className="text-base font-semibold text-[#000000]">{user?.name || "N/A"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#615d59]">Email Address</span>
              <span className="text-base font-semibold text-[#000000]">{user?.email || "N/A"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#615d59]">Role</span>
              <span className="text-sm uppercase font-mono px-2 py-0.5 rounded bg-[#f6f5f4] text-[#31302e] w-max">
                {user?.role || "user"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>Manage third-party authentication and OAuth providers</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-[#e3e2e0] bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-[#f6f5f4] border border-[#e3e2e0] flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" width="20" height="20">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#000000]">Google</span>
                    {user?.googleId ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#f6f5f4] text-[#615d59] border border-[#e3e2e0]">
                        Not connected
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#615d59]">
                    {user?.googleId
                      ? "Your Google identity is linked for 1-click sign-in."
                      : "Link your Google account for quick access."}
                  </span>
                </div>
              </div>

              {user?.googleId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (user.hasPassword === false) {
                      toast.error(
                        "Cannot unlink Google account without setting a password first."
                      );
                      return;
                    }
                    try {
                      const res = await apiClient.delete("/auth/google/link");
                      useAuthStore.getState().setUser(res.data.user);
                      toast.success("Google account unlinked successfully.");
                    } catch (err: any) {
                      toast.error(
                        err?.response?.data?.message || "Failed to unlink Google account."
                      );
                    }
                  }}
                  className="text-xs sm:w-auto"
                >
                  Unlink
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/api/v1/auth/google";
                  }}
                  className="text-xs sm:w-auto"
                >
                  Link Google
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <NotificationPreferencesPanel />
        </div>

        <Card className="border-red-200 bg-red-50/20">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Actions that impact your account lifecycle</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#000000]">Delete Account</span>
              <span className="text-xs text-[#615d59]">
                Soft-delete account with 30-day permanent purge delay
              </span>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirmDelete={handleDeleteAccount}
      />
    </div>
  );
}
