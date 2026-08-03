import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@lifeos/shared";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Alert, AlertDescription } from "../ui/Alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";

interface ResetPasswordFormProps {
  token: string;
  onSubmit?: (data: ResetPasswordInput) => Promise<void>;
  onSuccess?: () => void;
  externalError?: string | null;
}

export function ResetPasswordForm({
  token,
  onSubmit,
  onSuccess,
  externalError
}: ResetPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(externalError || null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "" }
  });

  const handleFormSubmit = async (data: ResetPasswordInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Enter a new password for your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="flex flex-col gap-4">
          {(errorMsg || externalError) && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg || externalError}</AlertDescription>
            </Alert>
          )}

          <input type="hidden" {...register("token")} value={token} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 10 chars with letter & number"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <span className="text-xs text-red-500">{errors.password.message}</span>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Reset Password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
