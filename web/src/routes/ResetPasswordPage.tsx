import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ResetPasswordForm } from "../components/auth/ResetPasswordForm";
import { apiClient } from "../lib/apiClient";
import type { ResetPasswordInput } from "@lifeos/shared";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const handleResetPassword = async (data: ResetPasswordInput) => {
    await apiClient.post("/auth/reset-password", data);
    toast.success("Password reset successful! Please sign in with your new password.");
    navigate("/login", { replace: true });
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5f4] p-4">
        <p className="text-sm text-red-500">Invalid or missing reset token.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f4] p-4">
      <ResetPasswordForm token={token} onSubmit={handleResetPassword} />
    </div>
  );
}
