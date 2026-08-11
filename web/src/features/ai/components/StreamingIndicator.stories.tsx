import type { Meta, StoryObj } from "@storybook/react";
import { StreamingIndicator } from "./StreamingIndicator";

const meta: Meta<typeof StreamingIndicator> = {
  title: "AI/StreamingIndicator",
  component: StreamingIndicator,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof StreamingIndicator>;

export const ActivelyStreaming: Story = {
  args: {
    isStreaming: true,
    backupModelStatus: null
  }
};

export const RetryingWithBackupModel: Story = {
  args: {
    isStreaming: true,
    backupModelStatus: "Switching to backup model (groq)..."
  }
};
