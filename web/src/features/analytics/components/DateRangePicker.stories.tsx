import type { Meta, StoryObj } from "@storybook/react";
import { DateRangePicker, computePresetRange } from "./DateRangePicker";

const meta: Meta<typeof DateRangePicker> = {
  title: "Analytics/DateRangePicker",
  component: DateRangePicker,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Shared date-range control (FR-12.3) driving both Productivity and Finance analytics views. Offers preset shortcuts ('This Week', 'This Month', 'Last 3 Months') and a bounded custom date range selector (<= 366 days)."
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof DateRangePicker>;

export const PresetThisMonth: Story = {
  args: {
    value: {
      ...computePresetRange("this_month"),
      preset: "this_month"
    },
    onChange: () => {}
  }
};

export const PresetThisWeek: Story = {
  args: {
    value: {
      ...computePresetRange("this_week"),
      preset: "this_week"
    },
    onChange: () => {}
  }
};

export const PresetLast3Months: Story = {
  args: {
    value: {
      ...computePresetRange("last_3_months"),
      preset: "last_3_months"
    },
    onChange: () => {}
  }
};

export const CustomRangeActive: Story = {
  args: {
    value: {
      startDate: "2026-07-01",
      endDate: "2026-08-31",
      preset: "custom"
    },
    onChange: () => {}
  }
};
