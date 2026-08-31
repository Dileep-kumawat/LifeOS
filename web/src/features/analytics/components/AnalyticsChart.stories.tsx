import type { Meta, StoryObj } from "@storybook/react";
import { AnalyticsChart } from "./AnalyticsChart";

const meta: Meta<typeof AnalyticsChart> = {
  title: "Analytics/AnalyticsChart",
  component: AnalyticsChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Reusable cross-domain chart component for LifeOS Analytics (FR-12.1 – FR-12.3). Built on Recharts on Web with accessible screen reader data tables and automatic empty states. (Note: Mobile client implements the matching RN-compatible SVG version with identical data contracts)."
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof AnalyticsChart>;

export const ProductivityBarVariant: Story = {
  args: {
    type: "bar",
    title: "Daily Focus & Habit Trend",
    subtitle: "Past 7 days",
    xKey: "date",
    series: [
      { dataKey: "focusMinutes", name: "Focus Minutes", color: "#0075de" },
      { dataKey: "habitsCompleted", name: "Habits Done", color: "#1aae39" }
    ],
    data: [
      { date: "Aug 25", focusMinutes: 50, habitsCompleted: 3 },
      { date: "Aug 26", focusMinutes: 90, habitsCompleted: 4 },
      { date: "Aug 27", focusMinutes: 45, habitsCompleted: 2 },
      { date: "Aug 28", focusMinutes: 120, habitsCompleted: 5 },
      { date: "Aug 29", focusMinutes: 60, habitsCompleted: 4 },
      { date: "Aug 30", focusMinutes: 75, habitsCompleted: 3 },
      { date: "Aug 31", focusMinutes: 110, habitsCompleted: 5 }
    ],
    yAxisFormatter: (val: number) => `${val}`,
    tooltipFormatter: (val: any, name: string) => [
      name === "Focus Minutes" ? `${val} mins` : `${val} habits`,
      name
    ]
  }
};

export const FinanceLineVariant: Story = {
  args: {
    type: "line",
    title: "Income & Spend Trend",
    subtitle: "Custom date range (Aug 1 - Aug 31)",
    xKey: "period",
    series: [
      { dataKey: "income", name: "Income", color: "#1aae39" },
      { dataKey: "expense", name: "Expense", color: "#dd5b00" },
      { dataKey: "net", name: "Net Savings", color: "#0075de", strokeDasharray: "4 4" }
    ],
    data: [
      { period: "Aug 01", income: 3000, expense: 850, net: 2150 },
      { period: "Aug 08", income: 500, expense: 620, net: -120 },
      { period: "Aug 15", income: 1200, expense: 450, net: 750 },
      { period: "Aug 22", income: 400, expense: 780, net: -380 },
      { period: "Aug 29", income: 1500, expense: 510, net: 990 }
    ],
    yAxisFormatter: (val: number) => `₹${val}`,
    tooltipFormatter: (val: any, name: string) => [`₹${Number(val).toFixed(2)}`, name]
  }
};

export const MultiSeries: Story = {
  args: {
    type: "bar",
    title: "Focus Sessions vs Habits Expected",
    xKey: "date",
    series: [
      { dataKey: "completedSessions", name: "Focus Sessions", color: "#0075de" },
      { dataKey: "habitsCompleted", name: "Habits Completed", color: "#1aae39" },
      { dataKey: "habitsExpected", name: "Habits Expected", color: "#62aef0" }
    ],
    data: [
      { date: "Mon", completedSessions: 3, habitsCompleted: 4, habitsExpected: 4 },
      { date: "Tue", completedSessions: 2, habitsCompleted: 3, habitsExpected: 4 },
      { date: "Wed", completedSessions: 4, habitsCompleted: 4, habitsExpected: 4 },
      { date: "Thu", completedSessions: 1, habitsCompleted: 2, habitsExpected: 4 },
      { date: "Fri", completedSessions: 5, habitsCompleted: 4, habitsExpected: 4 }
    ]
  }
};

export const EmptyNoData: Story = {
  args: {
    type: "bar",
    title: "Daily Focus Trend",
    subtitle: "New user or inactive period",
    xKey: "date",
    series: [{ dataKey: "focusMinutes", name: "Focus Minutes", color: "#0075de" }],
    data: [
      { date: "Aug 25", focusMinutes: 0 },
      { date: "Aug 26", focusMinutes: 0 },
      { date: "Aug 27", focusMinutes: 0 }
    ],
    emptyTitle: "Not Enough Data Yet",
    emptyMessage: "No focus time or habit check-ins logged for this date range."
  }
};

export const LoadingState: Story = {
  args: {
    type: "bar",
    title: "Daily Focus Trend",
    xKey: "date",
    series: [{ dataKey: "focusMinutes", name: "Focus Minutes", color: "#0075de" }],
    data: [],
    isLoading: true
  }
};
