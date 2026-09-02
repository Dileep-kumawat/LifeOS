import type { Meta, StoryObj } from "@storybook/react";
import { LoginForm } from "./LoginForm";

const meta: Meta<typeof LoginForm> = {
  title: "Auth/LoginForm",
  component: LoginForm,
  tags: ["autodocs"],
  argTypes: {
    externalError: { control: "text" }
  }
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: {
    externalError: null
  }
};

export const ValidationError: Story = {
  args: {
    externalError: "Invalid email or password"
  }
};

export const AccountLinkingRequired: Story = {
  args: {
    externalError:
      "An account with this email address already exists. Please sign in with your password, then link your Google account in Settings."
  }
};
