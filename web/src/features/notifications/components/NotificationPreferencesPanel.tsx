import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences
} from "../hooks/useNotifications";
import { NotificationPreferenceToggle } from "./NotificationPreferenceToggle";
import { PushOptInCard } from "./PushOptInCard";

const MODULES = [
  {
    key: "calendarReminders",
    title: "Calendar reminders",
    description: "Reminders before your events start."
  },
  {
    key: "habitReminders",
    title: "Habit reminders",
    description: "Nudges when it's time to check in on a habit."
  },
  {
    key: "system",
    title: "System updates",
    description: "Account and product announcements."
  }
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];

function PreferencesLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-48" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Settings-section content: the push opt-in card plus per-module, per-channel
 * toggles. Toggles PATCH the backend immediately on change — discrete
 * actions need no debounce or save button.
 */
export function NotificationPreferencesPanel() {
  const { data: preferences, isLoading, isError, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const handleToggle = (module: ModuleKey, channel: "push" | "inApp", checked: boolean) => {
    update.mutate({ [module]: { [channel]: checked } });
  };

  return (
    <div className="flex flex-col gap-6">
      <PushOptInCard />

      {isLoading && <PreferencesLoading />}

      {!isLoading && isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
            <AlertDescription>Could not load notification preferences.</AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </Alert>
      )}

      {!isLoading && !isError && preferences && (
        <Card>
          <CardHeader>
            <CardTitle>Reminder channels</CardTitle>
            <CardDescription>
              Turn reminders on or off per module and delivery channel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-[#e6e6e6]">
            {MODULES.map((module) => (
              <NotificationPreferenceToggle
                key={module.key}
                title={module.title}
                description={module.description}
                push={preferences[module.key].push}
                inApp={preferences[module.key].inApp}
                onPushChange={(checked) => handleToggle(module.key, "push", checked)}
                onInAppChange={(checked) => handleToggle(module.key, "inApp", checked)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
