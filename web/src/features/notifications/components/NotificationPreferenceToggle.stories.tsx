import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within, expect } from "@storybook/test";
import { NotificationPreferenceToggle } from "./NotificationPreferenceToggle";

const meta: Meta<typeof NotificationPreferenceToggle> = {
  title: "Notifications/NotificationPreferenceToggle",
  component: NotificationPreferenceToggle,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96 border border-[#e6e6e6] rounded-xl bg-white p-4">
        <Story />
      </div>
    )
  ],
  args: {
    title: "Calendar reminders",
    description: "Reminders before your events start.",
    push: true,
    inApp: true,
    onPushChange: () => {},
    onInAppChange: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof NotificationPreferenceToggle>;

export const AllOn: Story = {};

export const AllOff: Story = {
  args: { push: false, inApp: false }
};

export const PushOnly: Story = {
  args: { push: true, inApp: false }
};

export const InAppOnly: Story = {
  args: { push: false, inApp: true }
};

export const Disabled: Story = {
  args: { push: true, inApp: true, disabled: true }
};

/** Each sub-toggle is a discrete action — toggling fires its own callback. */
export const TogglesAreIndependent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pushToggle = canvas.getByRole("switch", { name: /calendar reminders, push notifications/i });
    const inAppToggle = canvas.getByRole("switch", {
      name: /calendar reminders, in-app notifications/i
    });

    await userEvent.click(pushToggle);
    expect(pushToggle).toHaveAttribute("aria-checked", "false");
    expect(inAppToggle).toHaveAttribute("aria-checked", "true");
  }
};