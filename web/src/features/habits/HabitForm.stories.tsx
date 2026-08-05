import type { Meta, StoryObj } from "@storybook/react";
import { HabitForm } from "./HabitForm";

const meta: Meta<typeof HabitForm> = {
  title: "Features/Habits/HabitForm",
  component: HabitForm,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof HabitForm>;

export const DefaultNewHabit: Story = {
  args: {
    onSubmit: () => {},
    onCancel: () => {}
  }
};

export const EditWeeklyHabit: Story = {
  args: {
    initialValues: {
      _id: "habit-1",
      title: "Gym Workout",
      frequency: {
        type: "weekly",
        daysOfWeek: [1, 3, 5],
        timesPerPeriod: 3
      }
    },
    onSubmit: () => {},
    onCancel: () => {}
  }
};
