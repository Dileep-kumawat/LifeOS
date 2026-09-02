import type { Meta, StoryObj } from "@storybook/react";
import { GoogleSignInButton } from "./GoogleSignInButton";

const meta: Meta<typeof GoogleSignInButton> = {
  title: "Auth/GoogleSignInButton",
  component: GoogleSignInButton,
  parameters: {
    layout: "centered"
  },
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof GoogleSignInButton>;

export const Default: Story = {
  args: {
    text: "Continue with Google"
  }
};

export const Loading: Story = {
  args: {
    text: "Continue with Google",
    isLoading: true
  }
};

export const Disabled: Story = {
  args: {
    text: "Continue with Google",
    disabled: true
  }
};

export const CustomText: Story = {
  args: {
    text: "Sign in with Google"
  }
};
