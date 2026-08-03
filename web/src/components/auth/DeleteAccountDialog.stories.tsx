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

export const OpenDialog: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    onConfirmDelete: async () => {}
  }
};
