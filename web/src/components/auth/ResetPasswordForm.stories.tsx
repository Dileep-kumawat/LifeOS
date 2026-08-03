import type { Meta, StoryObj } from "@storybook/react";
import { ResetPasswordForm } from "./ResetPasswordForm";

const meta: Meta<typeof ResetPasswordForm> = {
  title: "Auth/ResetPasswordForm",
  component: ResetPasswordForm,
  tags: ["autodocs"],
  argTypes: {
    token: { control: "text" },
    externalError: { control: "text" }
  }
};

export default meta;
type Story = StoryObj<typeof ResetPasswordForm>;

export const Default: Story = {
  args: {
    token: "sample-valid-token-12345",
    externalError: null
  }
};

export const ExpiredTokenError: Story = {
  args: {
    token: "expired-token-99999",
    externalError: "Invalid or expired password reset token."
  }
};
