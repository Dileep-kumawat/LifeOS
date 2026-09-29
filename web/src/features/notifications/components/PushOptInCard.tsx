import { useState, useEffect } from "react";
import { BellRing, CheckCircle2, Info, Loader2, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../components/ui/Card";
import { useIsInsideNativeApp } from "../../../lib/platform";
import { usePushPermission, type UsePushPermission } from "../hooks/usePushPermission";
import {
  getNativePushStatus,
  registerNativePush,
  unregisterNativePush
} from "../lib/nativePush";
import { notificationsApi } from "../api/notificationsApi";
import { isIOS } from "../lib/push";

export interface PushOptInCardProps {
  /** Optional injection point for stories/tests; defaults to the real hook. */
  permission?: UsePushPermission;
}

export function PushOptInCard({ permission: injectedPermission }: PushOptInCardProps) {
  const isNative = useIsInsideNativeApp();

  // Web Push state (used when not inside Capacitor native app)
  const livePermission = usePushPermission();
  const perm = injectedPermission ?? livePermission;
  const { status, isUpdating, isSendingTest = false, error, request, disable, sendTest } = perm;

  const webDeviceState =
    perm.deviceState ??
    (status === "subscribed"
      ? "registered"
      : status === "denied"
        ? "blocked"
        : status === "unsupported"
          ? "unsupported"
          : "not_registered");

  // Native Android state (used when inside Capacitor native app)
  const [nativeState, setNativeState] = useState<"registered" | "not_registered" | "blocked" | "unsupported">("not_registered");
  const [isNativeUpdating, setIsNativeUpdating] = useState(false);
  const [isNativeSendingTest, setIsNativeSendingTest] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNative) return;
    let isMounted = true;
    getNativePushStatus().then((st) => {
      if (isMounted) setNativeState(st);
    });
    return () => {
      isMounted = false;
    };
  }, [isNative]);

  const activeDeviceState = isNative ? nativeState : webDeviceState;

  const handleWebTest = async () => {
    if (sendTest) {
      const res = await sendTest();
      if (res.success) {
        toast.success("Test notification dispatched to your registered devices!");
      } else {
        toast.error(res.message || "Failed to send test notification");
      }
    }
  };

  const handleNativeRegister = async () => {
    setIsNativeUpdating(true);
    setNativeError(null);
    try {
      await registerNativePush();
      setNativeState("registered");
      toast.success("Push notifications enabled on this Android device!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enable notifications";
      setNativeError(msg);
      toast.error(msg);
    } finally {
      setIsNativeUpdating(false);
    }
  };

  const handleNativeDisable = async () => {
    setIsNativeUpdating(true);
    setNativeError(null);
    try {
      await unregisterNativePush();
      setNativeState("not_registered");
      toast.info("Notifications turned off for this Android device");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unregister notifications";
      setNativeError(msg);
    } finally {
      setIsNativeUpdating(false);
    }
  };

  const handleNativeTest = async () => {
    setIsNativeSendingTest(true);
    setNativeError(null);
    try {
      await notificationsApi.sendTestNotification({
        title: "LifeOS Android Test",
        body: "FCM push notification received successfully!"
      });
      toast.success("Test notification dispatched to your device!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger test notification";
      setNativeError(msg);
      toast.error(msg);
    } finally {
      setIsNativeSendingTest(false);
    }
  };

  // Badge rendering
  const renderBadge = (state: "registered" | "not_registered" | "blocked" | "unsupported") => {
    switch (state) {
      case "registered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="size-3" />
            Registered
          </span>
        );
      case "blocked":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <ShieldAlert className="size-3" />
            Blocked
          </span>
        );
      case "unsupported":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Info className="size-3" />
            Unsupported
          </span>
        );
      case "not_registered":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Not registered
          </span>
        );
    }
  };

  // ----------------------------------------------------
  // SITUATION C: Native Android App (Capacitor FCM)
  // ----------------------------------------------------
  if (isNative) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4" data-icon="inline-start" />
              Android Push Notifications
            </CardTitle>
            {renderBadge(activeDeviceState)}
          </div>
          <CardDescription>
            {activeDeviceState === "registered"
              ? "Push notifications are active for this Android device."
              : activeDeviceState === "blocked"
                ? "Notifications are blocked in your Android system settings."
                : "Receive real-time alerts and morning AI summaries on your Android device."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          {activeDeviceState === "blocked" && (
            <Alert variant="destructive" className="w-full">
              <Info className="size-4 shrink-0" />
              <div className="min-w-0">
                <AlertTitle>Notifications are blocked</AlertTitle>
                <AlertDescription>
                  Notifications for LifeOS are disabled in Android Settings. To receive reminders, open
                  your device Settings &gt; Apps &gt; LifeOS &gt; Notifications and toggle them on.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {activeDeviceState === "registered" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNativeTest}
                disabled={isNativeSendingTest}
              >
                {isNativeSendingTest ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Send className="size-3.5 mr-1.5" />
                )}
                Send test notification
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNativeDisable}
                disabled={isNativeUpdating}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Turn off
              </Button>
            </div>
          )}

          {activeDeviceState === "not_registered" && (
            <Button onClick={handleNativeRegister} disabled={isNativeUpdating}>
              <BellRing className="size-4 mr-1.5" />
              {isNativeUpdating ? "Enabling…" : "Enable on this device"}
            </Button>
          )}

          {nativeError && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {nativeError}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ----------------------------------------------------
  // SITUATIONS A & B: Web Push / Browser / Installed PWA
  // ----------------------------------------------------
  const isBraveError = error && /brave/i.test(error);
  const isIosError = error && /ios|home screen/i.test(error);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" data-icon="inline-start" />
            Device Push Notifications
          </CardTitle>
          {renderBadge(activeDeviceState)}
        </div>
        <CardDescription>
          {activeDeviceState === "registered"
            ? "Push notifications are active for this device."
            : activeDeviceState === "blocked"
              ? "Notifications are blocked in your browser site settings."
              : activeDeviceState === "unsupported"
                ? isIOS()
                  ? "On iOS, push notifications require installing LifeOS to your Home Screen first."
                  : "Push notifications aren't supported in this browser."
                : status === "granted"
                  ? "Notifications are allowed in your browser. Register this device to start receiving pushes."
                  : "Allow push notifications to be reminded before events and when habits are due — even when LifeOS isn't open."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        {activeDeviceState === "blocked" && (
          <Alert variant="destructive" className="w-full">
            <Info className="size-4 shrink-0" />
            <div className="min-w-0">
              <AlertTitle>Notifications are blocked</AlertTitle>
              <AlertDescription>
                LifeOS can&apos;t show its prompt because notifications are disabled for this site in
                your browser. To receive reminders, allow notifications for LifeOS in your browser&apos;s
                site settings, then reload this page.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {isBraveError && (
          <Alert variant="destructive" className="w-full">
            <ShieldAlert className="size-4 shrink-0" />
            <div className="min-w-0">
              <AlertTitle>Brave Browser Push Blocked</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </Alert>
        )}

        {isIosError && !isBraveError && (
          <Alert className="w-full">
            <Info className="size-4 shrink-0" />
            <div className="min-w-0">
              <AlertTitle>iOS Home Screen Required</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </Alert>
        )}

        {activeDeviceState === "registered" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWebTest}
              disabled={isSendingTest}
            >
              {isSendingTest ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="size-3.5 mr-1.5" />
              )}
              Send test notification
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void disable()}
              disabled={isUpdating}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Turn off
            </Button>
          </div>
        )}

        {activeDeviceState === "not_registered" && (
          <Button onClick={() => void request()} disabled={isUpdating}>
            <BellRing className="size-4 mr-1.5" />
            {isUpdating
              ? "Enabling…"
              : status === "granted"
                ? "Register this device"
                : "Allow notifications"}
          </Button>
        )}

        {error && !isBraveError && !isIosError && activeDeviceState !== "blocked" && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
