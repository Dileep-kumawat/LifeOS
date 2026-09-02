import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { apiClient, refreshAccessToken } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";
import type { LoginInput } from "@lifeos/shared";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

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
            navigate(from, { replace: true });
          })
          .catch(() => {
            refreshAccessToken().then((token) => {
              if (token) {
                navigate(from, { replace: true });
              }
            });
          });
      } else {
        refreshAccessToken().then((token) => {
          if (token) {
            navigate(from, { replace: true });
          }
        });
      }
    } else if (errorParam === "account_linking_required") {
      setOauthError(
        messageParam ||
          "An account with this email address already exists. Please sign in with your password, then link your Google account in Settings."
      );
    } else if (errorParam) {
      setOauthError(messageParam || `Google sign-in failed: ${errorParam.replace(/_/g, " ")}`);
    }
  }, [searchParams, navigate, from, setAuth]);

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
        externalError={oauthError}
      />
    </div>
  );
}
