import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/apiClient";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { DeleteAccountDialog } from "../components/auth/DeleteAccountDialog";

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
    <div className="min-h-screen bg-[#f6f5f4] p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#000000]">Account Settings</h1>
          <Button variant="outline" onClick={handleLogout}>
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

        <Card className="border-red-200 bg-red-50/20">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Actions that impact your account lifecycle</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#000000]">Delete Account</span>
              <span className="text-xs text-[#615d59]">Soft-delete account with 30-day permanent purge delay</span>
            </div>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
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
