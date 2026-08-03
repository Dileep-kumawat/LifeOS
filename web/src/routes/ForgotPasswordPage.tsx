import { useNavigate } from "react-router-dom";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { apiClient } from "../lib/apiClient";
import type { ForgotPasswordInput } from "@lifeos/shared";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleForgotPassword = async (data: ForgotPasswordInput) => {
    await apiClient.post("/auth/forgot-password", data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f4] p-4">
      <ForgotPasswordForm
        onSubmit={handleForgotPassword}
        onNavigateLogin={() => navigate("/login")}
      />
    </div>
  );
}
