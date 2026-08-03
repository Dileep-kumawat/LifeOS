import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { RecurrenceDescriptor } from "@lifeos/shared";
import { RepeatRuleBuilder } from "./RepeatRuleBuilder";

const meta: Meta<typeof RepeatRuleBuilder> = {
  title: "Calendar/RepeatRuleBuilder",
  component: RepeatRuleBuilder,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof RepeatRuleBuilder>;

export const Weekly: Story = {
  render: (args) => {
    const [descriptor, setDescriptor] = useState<RecurrenceDescriptor>({
      frequency: "weekly",
      interval: 1,
      byDay: ["MO", "WE"],
      endType: "never"
    });
    return <RepeatRuleBuilder {...args} value={descriptor} onChange={setDescriptor} />;
  }
};

export const DailyForThirtyDays: Story = {
  render: (args) => {
    const [descriptor, setDescriptor] = useState<RecurrenceDescriptor>({
      frequency: "daily",
      interval: 1,
      endType: "after",
      count: 30
    });
    return <RepeatRuleBuilder {...args} value={descriptor} onChange={setDescriptor} />;
  }
};

export const MonthlyUntilDate: Story = {
  render: (args) => {
    const [descriptor, setDescriptor] = useState<RecurrenceDescriptor>({
      frequency: "monthly",
      interval: 1,
      endType: "onDate",
      until: new Date(2026, 11, 31, 12, 0, 0).toISOString()
    });
    return <RepeatRuleBuilder {...args} value={descriptor} onChange={setDescriptor} />;
  }
};
