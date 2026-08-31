import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { NotificationPreferences } from "@lifeos/shared";
import { notificationKeys } from "../api/queryKeys";
import { NotificationPreferencesPanel } from "./NotificationPreferencesPanel";

const defaultPrefs: NotificationPreferences = {
  calendarReminders: { push: true, inApp: true },
  habitReminders: { push: true, inApp: true },
  system: { push: true, inApp: true },
  financeBudgetAlerts: { push: true, inApp: true },
  focusSessionAlerts: { push: true, inApp: true },
  periodicRecommendations: { push: true, inApp: true },
  dailySummary: {
    deliveryTime: "07:00",
    channels: ["push", "in_app"],
    timezone: "America/New_York"
  },
  dndDuringFocus: false
};

function prefsWrap(data?: NotificationPreferences | null, isError = false): Decorator {
  return (Story) => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } }
    });

    if (isError) {
      client.setQueryDefaults(notificationKeys.preferences(), {
        queryFn: () => Promise.reject(new Error("Failed to load preferences"))
      });
    } else if (data !== undefined) {
      client.setQueryData(notificationKeys.preferences(), data);
    }

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-2xl mx-auto p-4 bg-background">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

const meta: Meta<typeof NotificationPreferencesPanel> = {
  title: "Notifications/NotificationPreferencesPanel",
  component: NotificationPreferencesPanel,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof NotificationPreferencesPanel>;

export const Populated: Story = {
  decorators: [prefsWrap(defaultPrefs)]
};

export const Loading: Story = {
  decorators: [prefsWrap(undefined)]
};

export const ErrorState: Story = {
  decorators: [prefsWrap(null, true)]
};

export const CustomDailySummary: Story = {
  decorators: [
    prefsWrap({
      ...defaultPrefs,
      dailySummary: {
        deliveryTime: "08:30",
        channels: ["push", "in_app", "email"],
        timezone: "America/Los_Angeles"
      }
    })
  ]
};
