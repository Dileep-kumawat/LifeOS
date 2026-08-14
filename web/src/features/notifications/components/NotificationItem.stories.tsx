import type { Meta, StoryObj } from "@storybook/react";
import type { Notification as AppNotification } from "@lifeos/shared";
import { NotificationItem } from "./NotificationItem";

function item(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: "notif_1",
    userId: "u1",
    type: "calendar_reminder",
    channel: "in_app",
    payload: { title: "Design review", body: "Starts in 15 minutes", data: { eventId: "evt_1" } },
    deliveryStatus: "sent",
    readStatus: "read",
    scheduledFor: "2026-08-04T14:00:00.000Z",
    sentAt: "2026-08-04T13:45:00.000Z",
    readAt: null,
    createdAt: "2026-08-04T13:00:00.000Z",
    ...overrides
  };
}

const meta: Meta<typeof NotificationItem> = {
  title: "Notifications/NotificationItem",
  component: NotificationItem,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-80 border border-[#e6e6e6] rounded-xl bg-white">
        <Story />
      </div>
    )
  ],
  args: { onOpen: () => {} }
};

export default meta;
type Story = StoryObj<typeof NotificationItem>;

export const Unread: Story = {
  args: { notification: item({ readStatus: "unread" }) }
};

export const Read: Story = {
  args: { notification: item({ readStatus: "read" }) }
};

export const CalendarReminder: Story = {
  args: { notification: item({ type: "calendar_reminder", readStatus: "unread" }) }
};

export const HabitReminder: Story = {
  args: {
    notification: item({
      type: "habit_reminder",
      readStatus: "unread",
      payload: { title: "Morning run", body: "You're on a 5 day streak", data: { habitId: "h1" } }
    })
  }
};

export const System: Story = {
  args: {
    notification: item({
      type: "system",
      readStatus: "read",
      payload: { title: "Welcome to LifeOS", body: "Here are some tips to get started" }
    })
  }
};

export const BudgetAlert: Story = {
  args: {
    notification: item({
      type: "budget_alert",
      readStatus: "unread",
      payload: { title: "Groceries over budget", body: "Spent ₹46 more than planned" }
    })
  }
};

export const DailySummary: Story = {
  args: {
    notification: item({
      type: "daily_summary",
      readStatus: "read",
      payload: { title: "Your day at a glance", body: "3 events, 5 habits due" }
    })
  }
};

export const Batched: Story = {
  args: {
    notification: item({
      type: "habit_reminder",
      readStatus: "unread",
      payload: {
        title: "You have 3 notifications",
        body: "",
        items: [{ title: "Morning run" }, { title: "Read 20 pages" }, { title: "Drink water" }]
      }
    })
  }
};
