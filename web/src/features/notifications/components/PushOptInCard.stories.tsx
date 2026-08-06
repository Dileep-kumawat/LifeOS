import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within, expect, spyOn } from "@storybook/test";
import { PushOptInCard } from "./PushOptInCard";
import type { UsePushPermission } from "../hooks/usePushPermission";

function permissionMock(overrides: Partial<UsePushPermission>): UsePushPermission {
  return {
    status: "default",
    isUpdating: false,
    error: null,
    request: () => Promise.resolve(),
    disable: () => Promise.resolve(),
    ...overrides
  };
}

const meta: Meta<typeof PushOptInCard> = {
  title: "Notifications/PushOptInCard",
  component: PushOptInCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-full max-w-2xl">
        <Story />
      </div>
    )
  ]
};

export default meta;
type Story = StoryObj<typeof PushOptInCard>;

export const Initial: Story = {
  args: { permission: permissionMock({ status: "default" }) }
};

export const Pending: Story = {
  args: { permission: permissionMock({ status: "default", isUpdating: true }) }
};

export const Granted: Story = {
  args: { permission: permissionMock({ status: "granted" }) }
};

export const Subscribed: Story = {
  args: { permission: permissionMock({ status: "subscribed" }) }
};

export const Denied: Story = {
  args: { permission: permissionMock({ status: "denied" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText(/notifications are blocked/i)).toBeInTheDocument();
    // Browser-level denial is answered with guidance, never a re-prompt button.
    expect(canvas.queryByRole("button", { name: /allow notifications/i })).not.toBeInTheDocument();
  }
};

// Shared, spiable instance for the interaction story below.
const spied = permissionMock({ status: "default" });

/**
 * The browser permission API is only reached through the explicit in-app
 * button click — the opt-in `request` action is never fired on mount.
 */
export const NeverPromptsOnMount: Story = {
  args: { permission: spied },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const requestSpy = spyOn(spied, "request");

    try {
      const allowButton = await canvas.findByRole("button", { name: /allow notifications/i });
      expect(requestSpy).not.toHaveBeenCalled();
      await userEvent.click(allowButton);
      expect(requestSpy).toHaveBeenCalledTimes(1);
    } finally {
      requestSpy.mockRestore();
    }
  }
};