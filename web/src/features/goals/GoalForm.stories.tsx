import type { Meta, StoryObj } from "@storybook/react";
import { GoalForm } from "./GoalForm";

const meta: Meta<typeof GoalForm> = {
  title: "Features/Goals/GoalForm",
  component: GoalForm,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof GoalForm>;

export const DefaultNewGoal: Story = {
  args: {
    onSubmit: () => {},
    onCancel: () => {}
  }
};

export const EditGoalWithMilestones: Story = {
  args: {
    initialValues: {
      _id: "goal-1",
      title: "Launch LifeOS Phase 1 MVP",
      description: "Complete Auth, Calendar, Goals & Habits modules.",
      status: "active",
      milestones: [
        { _id: "m1", title: "Auth module", completed: true, order: 0 },
        { _id: "m2", title: "Calendar module", completed: true, order: 1 },
        { _id: "m3", title: "Goals & Habits module", completed: false, order: 2 }
      ]
    },
    onSubmit: () => {},
    onCancel: () => {}
  }
};
