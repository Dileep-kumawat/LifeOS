import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@lifeos/shared";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Alert, AlertDescription } from "../ui/Alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/Card";

interface RegisterFormProps {
  onSubmit?: (data: RegisterInput) => Promise<void>;
  onNavigateLogin?: () => void;
  externalError?: string | null;
}

export function RegisterForm({ onSubmit, onNavigateLogin, externalError }: RegisterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(externalError || null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" }
  });

  const handleFormSubmit = async (data: RegisterInput) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your LifeOS account</CardTitle>
        <CardDescription>Start managing your calendar, goals, habits, and notes</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="flex flex-col gap-4">
          {(errorMsg || externalError) && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg || externalError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Jane Doe"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
          </div>

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
            <Label htmlFor="password">Password</Label>
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

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Create Account
          </Button>

          {onNavigateLogin && (
            <p className="text-xs text-center text-[#615d59]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onNavigateLogin}
                className="font-medium text-[#0075de] hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
