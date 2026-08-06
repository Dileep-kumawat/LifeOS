import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { userEvent, within, expect } from "@storybook/test";
import { notificationKeys } from "../api/queryKeys";
import { NotificationBell } from "./NotificationBell";

function seededClient(ops: { unread: number }) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } }
  });
  client.setQueryData(notificationKeys.unreadCount(), { unread: ops.unread });
  return client;
}

function withSeed(unread: number): Decorator {
  return (Story) => (
    <QueryClientProvider client={seededClient({ unread })}>
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof NotificationBell> = {
  title: "Notifications/NotificationBell",
  component: NotificationBell,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof NotificationBell>;

export const ZeroUnread: Story = {
  decorators: [withSeed(0)]
};

export const SomeUnread: Story = {
  decorators: [withSeed(3)]
};

export const BadgeOverflow: Story = {
  name: "Overflow (9+)",
  decorators: [withSeed(12)]
};

export const OpensPanel: Story = {
  decorators: [withSeed(3)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByRole("button", { name: /unread notifications/i });
    await userEvent.click(button);
    const dialog = await canvas.findByRole("dialog", { name: /notifications/i });
    expect(dialog).toBeInTheDocument();
  }
};

export const AnnounceCount: Story = {
  name: "Announces unread count",
  decorators: [withSeed(5)],
  play: async ({ canvasElement }) => {
    const canvas = await within(canvasElement);
    const bell = await canvas.findByRole("button", { name: /5 unread notifications/i });
    expect(bell).toHaveAttribute("aria-label", "5 unread notifications");
    expect(within(bell).getByRole("status")).toHaveTextContent("5 unread notifications");
  }
};