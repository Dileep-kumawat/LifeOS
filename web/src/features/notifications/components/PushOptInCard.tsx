import { BellRing, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { usePushPermission, type UsePushPermission } from "../hooks/usePushPermission";

export interface PushOptInCardProps {
  /** Optional injection point for stories/tests; defaults to the real hook. */
  permission?: UsePushPermission;
}

/**
 * Web Push opt-in. The browser permission prompt is NEVER triggered on mount —
 * the card first explains what enabling notifications means, and only the
 * explicit "Allow notifications" button calls `request()` (which is the single
 * place that touches the browser permission API). A browser-level denial is
 * detected and answered with re-enable guidance instead of a broken re-prompt.
 */
export function PushOptInCard({ permission: injectedPermission }: PushOptInCardProps) {
  const livePermission = usePushPermission();
  const { status, isUpdating, error, request, disable } = injectedPermission ?? livePermission;

  if (status === "unsupported") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" data-icon="inline-start" />
            Notifications
          </CardTitle>
          <CardDescription>
            Push notifications aren&apos;t supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "denied") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" data-icon="inline-start" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Info className="size-4 shrink-0" />
            <div className="min-w-0">
              <AlertTitle>Notifications are blocked</AlertTitle>
              <AlertDescription>
                LifeOS can&apos;t show its own prompt because notifications are disabled for this
                site in your browser. To receive reminders, allow notifications for LifeOS in your
                browser&apos;s site settings, then return here to turn them on.
              </AlertDescription>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (status === "subscribed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" data-icon="inline-start" />
            Notifications
          </CardTitle>
          <CardDescription>Push notifications are on for this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <Button variant="outline" size="sm" onClick={() => void disable()} disabled={isUpdating}>
            Turn off
          </Button>
        </CardContent>
      </Card>
    );
  }

  // status === "default" (not yet asked) or "granted" (permission given, device
  // not yet registered with the backend).
  const alreadyGranted = status === "granted";
  const description = alreadyGranted
    ? "Notifications are already allowed in your browser. Finish enabling them for this device."
    : "Allow push notifications to be reminded before events and when habits are due — even when LifeOS isn't open. You can change this anytime in Settings.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4" data-icon="inline-start" />
          Notifications
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        <Button onClick={() => void request()} disabled={isUpdating}>
          <BellRing className="size-4" data-icon="inline-start" />
          {isUpdating ? "Enabling…" : alreadyGranted ? "Register this device" : "Allow notifications"}
        </Button>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}