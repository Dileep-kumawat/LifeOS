import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@lifeos/shared";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Alert, AlertDescription, AlertTitle } from "../ui/Alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";

interface ForgotPasswordFormProps {
  onSubmit?: (data: ForgotPasswordInput) => Promise<void>;
  onNavigateLogin?: () => void;
  isSuccessState?: boolean;
}

export function ForgotPasswordForm({ onSubmit, onNavigateLogin, isSuccessState = false }: ForgotPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(isSuccessState);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  const handleFormSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setSubmitted(true);
    } catch (_err) {
      // Always show success message to prevent user enumeration
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a password reset link
        </CardDescription>
      </CardHeader>
      {submitted ? (
        <CardContent className="flex flex-col gap-4">
          <Alert variant="success">
            <div className="flex flex-col gap-1">
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>
                If an account exists with that email address, we have sent instructions to reset your password.
              </AlertDescription>
            </div>
          </Alert>
          {onNavigateLogin && (
            <Button variant="outline" onClick={onNavigateLogin} className="w-full mt-2">
              Back to Sign In
            </Button>
          )}
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <CardContent className="flex flex-col gap-4">
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
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Send Reset Link
            </Button>

            {onNavigateLogin && (
              <button
                type="button"
                onClick={onNavigateLogin}
                className="text-xs text-[#0075de] hover:underline"
              >
                Back to Sign In
              </button>
            )}
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
