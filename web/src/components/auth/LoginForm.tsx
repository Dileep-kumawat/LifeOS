import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@lifeos/shared";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Alert, AlertDescription } from "../ui/Alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";

interface LoginFormProps {
  onSubmit?: (data: LoginInput) => Promise<void>;
  onNavigateRegister?: () => void;
  onNavigateForgotPassword?: () => void;
  externalError?: string | null;
}

export function LoginForm({
  onSubmit,
  onNavigateRegister,
  onNavigateForgotPassword,
  externalError
}: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(externalError || null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const handleFormSubmit = async (data: LoginInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to LifeOS</CardTitle>
        <CardDescription>Sign in to your personal operating system</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="flex flex-col gap-4">
          {(errorMsg || externalError) && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg || externalError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {onNavigateForgotPassword && (
                <button
                  type="button"
                  onClick={onNavigateForgotPassword}
                  className="text-xs text-[#0075de] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <span className="text-xs text-red-500">{errors.password.message}</span>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign In
          </Button>

          {onNavigateRegister && (
            <p className="text-xs text-center text-[#615d59]">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-medium text-[#0075de] hover:underline"
              >
                Sign up
              </button>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
