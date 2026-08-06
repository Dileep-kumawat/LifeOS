import type { Meta, StoryObj } from "@storybook/react";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const meta: Meta<typeof DeleteAccountDialog> = {
  title: "Auth/DeleteAccountDialog",
  component: DeleteAccountDialog,
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" }
  }
};

export default meta;
type Story = StoryObj<typeof DeleteAccountDialog>;

const noop = {
  onOpenChange: () => {},
  onConfirmDelete: async () => {}
};

export const OpenDialog: Story = {
  args: {
    open: true,
    ...noop
  }
};

export const ClosedDialog: Story = {
  args: {
    open: false,
    ...noop
  }
};
