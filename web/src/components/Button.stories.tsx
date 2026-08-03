import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive"]
    },
    disabled: { control: "boolean" }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: "Save changes", variant: "default" }
};

export const Secondary: Story = {
  args: { children: "Cancel", variant: "secondary" }
};

export const Ghost: Story = {
  args: { children: "Learn more", variant: "ghost" }
};

export const Disabled: Story = {
  args: { children: "Save changes", variant: "default", disabled: true }
};
