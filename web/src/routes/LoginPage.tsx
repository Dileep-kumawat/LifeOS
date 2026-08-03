import { useNavigate, useLocation } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";
import type { LoginInput } from "@lifeos/shared";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  const handleLogin = async (data: LoginInput) => {
    const response = await apiClient.post("/auth/login", data);
    const { user, accessToken } = response.data;
    setAuth(user, accessToken);
    navigate(from, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f4] p-4">
      <LoginForm
        onSubmit={handleLogin}
        onNavigateRegister={() => navigate("/register")}
        onNavigateForgotPassword={() => navigate("/forgot-password")}
      />
    </div>
  );
}
