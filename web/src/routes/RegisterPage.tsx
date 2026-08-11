import { useNavigate } from "react-router-dom";
import { RegisterForm } from "../components/auth/RegisterForm";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";
import type { RegisterInput } from "@lifeos/shared";

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleRegister = async (data: RegisterInput) => {
    const response = await apiClient.post("/auth/register", data);
    const { user, accessToken } = response.data;
    setAuth(user, accessToken);
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f4] p-4">
      <RegisterForm onSubmit={handleRegister} onNavigateLogin={() => navigate("/login")} />
    </div>
  );
}
