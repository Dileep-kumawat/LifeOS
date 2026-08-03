import type { Meta, StoryObj } from "@storybook/react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

const meta: Meta<typeof ForgotPasswordForm> = {
  title: "Auth/ForgotPasswordForm",
  component: ForgotPasswordForm,
  tags: ["autodocs"],
  argTypes: {
    isSuccessState: { control: "boolean" }
  }
};

export default meta;
type Story = StoryObj<typeof ForgotPasswordForm>;

export const Default: Story = {
  args: {
    isSuccessState: false
  }
};

export const SuccessState: Story = {
  args: {
    isSuccessState: true
  }
};
