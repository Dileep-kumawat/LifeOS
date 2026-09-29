import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ResetPasswordForm } from "../components/auth/ResetPasswordForm";
import { apiClient } from "../lib/apiClient";
import type { ResetPasswordInput } from "@lifeos/shared";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: paramToken } = useParams<{ token: string }>();
  const token = searchParams.get("token") || paramToken;
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetPassword = async (data: ResetPasswordInput) => {
    await apiClient.post("/auth/reset-password", data);
    setIsSuccess(true);
    toast.success("Password reset successful! Please sign in with your new password.");
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2000);
  };

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#faf9f8] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              The password reset link is invalid, incomplete, or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Missing Reset Token</AlertTitle>
              <AlertDescription>
                We could not find a valid reset token in the URL. Please request a new password reset link.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => navigate("/forgot-password")}>
              Request New Reset Link
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#faf9f8] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Reset</CardTitle>
            <CardDescription>Your password has been successfully updated.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="success">
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Your password has been reset. Redirecting you to sign in...
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Sign In Now
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#faf9f8] p-4">
      <ResetPasswordForm token={token} onSubmit={handleResetPassword} />
    </div>
  );
}
