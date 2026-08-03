import type { Meta, StoryObj } from "@storybook/react";
import { RegisterForm } from "./RegisterForm";

const meta: Meta<typeof RegisterForm> = {
  title: "Auth/RegisterForm",
  component: RegisterForm,
  tags: ["autodocs"],
  argTypes: {
    externalError: { control: "text" }
  }
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {
  args: {
    externalError: null
  }
};

export const DuplicateEmailError: Story = {
  args: {
    externalError: "An account with this email address already exists."
  }
};
