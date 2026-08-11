import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { userEvent, within, screen, expect, waitFor, spyOn } from "@storybook/test";
import type { Notification as AppNotification } from "@lifeos/shared";
import { notificationKeys } from "../api/queryKeys";
import { notificationsApi, type NotificationsListResponse } from "../api/notificationsApi";
import { NotificationPanel } from "./NotificationPanel";
import { NotificationBell } from "./NotificationBell";

function notification(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: "n1",
    userId: "u1",
    type: "calendar_reminder",
    channel: "in_app",
    payload: { title: "Design review", body: "Starts in 15 minutes", data: { eventId: "ev1" } },
    deliveryStatus: "sent",
    readStatus: "unread",
    scheduledFor: "2026-08-04T14:00:00.000Z",
    sentAt: "2026-08-04T13:45:00.000Z",
    readAt: null,
    createdAt: "2026-08-04T13:00:00.000Z",
    ...overrides
  };
}

const UNREAD = notification({
  readStatus: "unread",
  payload: { title: "Design review", body: "Starts in 15 minutes", data: { eventId: "ev1" } }
});
const READ = notification({
  id: "n2",
  type: "system",
  readStatus: "read",
  payload: { title: "Welcome", body: "Welcome to LifeOS" }
});

function buildClient(ops: { unread: number; list?: AppNotification[] }) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } }
  });
  client.setQueryData(notificationKeys.unreadCount(), { unread: ops.unread });
  if (ops.list) {
    const response: NotificationsListResponse = {
      notifications: ops.list,
      pagination: { page: 1, limit: 20, total: ops.list.length, pages: 1 }
    };
    client.setQueryData(notificationKeys.list(), response);
  }
  return client;
}

function panelWrap(ops: { unread: number; list?: AppNotification[] }): Decorator {
  return (Story) => (
    <QueryClientProvider client={buildClient(ops)}>
      <MemoryRouter>
        <div className="pt-2">
          <Story />
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof NotificationPanel> = {
  title: "Notifications/NotificationPanel",
  component: NotificationPanel,
  tags: ["autodocs"],
  args: { onClose: () => {} }
};

export default meta;
type Story = StoryObj<typeof NotificationPanel>;

export const Loading: Story = {
  decorators: [panelWrap({ unread: 0 })]
};

export const Empty: Story = {
  decorators: [panelWrap({ unread: 0, list: [] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText(/no notifications yet/i)).toBeInTheDocument();
    expect(canvas.queryByText("Design review")).not.toBeInTheDocument();
  }
};

export const WithNotifications: Story = {
  decorators: [panelWrap({ unread: 1, list: [UNREAD, READ] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      await canvas.findByRole("button", { name: /design review, unread/i })
    ).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: /welcome, read/i })).toBeInTheDocument();
  }
};

/**
 * Optimistic mark-as-read: flips the item immediately, then rolls back when
 * the PATCH fails (simulated server error).
 */
export const RollsBackOnReadFailure: Story = {
  decorators: [panelWrap({ unread: 1, list: [UNREAD] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const markReadSpy = spyOn(notificationsApi, "markRead").mockRejectedValue(
      new Error("Simulated failure")
    );
    const listSpy = spyOn(notificationsApi, "list").mockResolvedValue({
      notifications: [UNREAD],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 }
    } as NotificationsListResponse);

    try {
      const unreadButton = await canvas.findByRole("button", { name: /design review, unread/i });
      await userEvent.click(unreadButton);

      // Optimistic flip happens before the PATCH resolves.
      await canvas.findByRole("button", { name: /design review, read/i });

      // Rolls back after the simulated failure.
      await waitFor(() => {
        expect(canvas.getByRole("button", { name: /design review, unread/i })).toBeInTheDocument();
      });
    } finally {
      markReadSpy.mockRestore();
      listSpy.mockRestore();
    }
  }
};

/**
 * Mark-all-read clears the unread badge immediately (no poll cycle needed).
 * Renders the real Bell + Panel together so the badge is asserted.
 */
export const MarkAllReadClearsBadge: Story = {
  name: "Mark all read clears badge immediately",
  render: () => <NotificationBell />,
  decorators: [panelWrap({ unread: 2, list: [UNREAD, READ] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const markAllSpy = spyOn(notificationsApi, "markAllRead").mockResolvedValue({
      updatedCount: 2
    });

    try {
      const bell = await canvas.findByRole("button", { name: /2 unread notifications/i });
      await userEvent.click(bell);

      const markAll = await canvas.findByRole("button", {
        name: /mark all notifications as read/i
      });
      await userEvent.click(markAll);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /no unread notifications/i })
        ).toBeInTheDocument();
      });
    } finally {
      markAllSpy.mockRestore();
    }
  }
};
