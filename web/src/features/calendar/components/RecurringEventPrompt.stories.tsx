import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { RecurringEventPrompt } from "./RecurringEventPrompt";

const meta: Meta<typeof RecurringEventPrompt> = {
  title: "Calendar/RecurringEventPrompt",
  component: RecurringEventPrompt,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof RecurringEventPrompt>;

export const Default: Story = {
  render: (args) => {
    const [scope, setScope] = useState<"occurrence" | "series">("occurrence");
    return <RecurringEventPrompt {...args} value={scope} onChange={setScope} />;
  }
};
