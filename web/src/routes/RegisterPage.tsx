import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RegisterForm } from "../components/auth/RegisterForm";
import { apiClient, refreshAccessToken } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";
import type { RegisterInput } from "@lifeos/shared";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const isOauthSuccess = searchParams.get("oauth_success") === "true";
    const refreshTokenParam = searchParams.get("refreshToken");
    const errorParam = searchParams.get("error");
    const messageParam = searchParams.get("message");

    if (isOauthSuccess) {
      if (refreshTokenParam) {
        apiClient
          .post("/auth/refresh", { refreshToken: refreshTokenParam })
          .then((res) => {
            const { user, accessToken } = res.data;
            setAuth(user, accessToken);
            navigate("/", { replace: true });
          })
          .catch(() => {
            refreshAccessToken().then((token) => {
              if (token) {
                navigate("/", { replace: true });
              }
            });
          });
      } else {
        refreshAccessToken().then((token) => {
          if (token) {
            navigate("/", { replace: true });
          }
        });
      }
    } else if (errorParam === "account_linking_required") {
      setOauthError(
        messageParam ||
          "An account with this email address already exists. Please sign in with your password, then link your Google account in Settings."
      );
    } else if (errorParam) {
      setOauthError(messageParam || `Google sign-up failed: ${errorParam.replace(/_/g, " ")}`);
    }
  }, [searchParams, navigate, setAuth]);

  const handleRegister = async (data: RegisterInput) => {
    const response = await apiClient.post("/auth/register", data);
    const { user, accessToken } = response.data;
    setAuth(user, accessToken);
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f4] p-4">
      <RegisterForm
        onSubmit={handleRegister}
        onNavigateLogin={() => navigate("/login")}
        externalError={oauthError}
      />
    </div>
  );
}
