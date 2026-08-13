import type { Meta, StoryObj } from "@storybook/react";
import { TrendLineChart } from "./TrendLineChart";

const meta: Meta<typeof TrendLineChart> = {
  title: "Finance/TrendLineChart",
  component: TrendLineChart,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof TrendLineChart>;

export const PopulatedSixMonths: Story = {
  args: {
    title: "Multi-Month Spending & Income Trend",
    data: [
      { month: "2026-03", income: 3200, expense: 2100, net: 1100 },
      { month: "2026-04", income: 3200, expense: 2450, net: 750 },
      { month: "2026-05", income: 3500, expense: 1980, net: 1520 },
      { month: "2026-06", income: 3200, expense: 2300, net: 900 },
      { month: "2026-07", income: 3800, expense: 2150, net: 1650 },
      { month: "2026-08", income: 3500, expense: 1850, net: 1650 }
    ]
  }
};

export const SingleMonthHistory: Story = {
  args: {
    title: "Spending Trend",
    data: [
      { month: "2026-08", income: 3500, expense: 1850, net: 1650 }
    ]
  }
};
