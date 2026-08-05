import type { Meta, StoryObj } from "@storybook/react";
import { GoalProgressBar } from "./GoalProgressBar";

const meta: Meta<typeof GoalProgressBar> = {
  title: "Features/Goals/GoalProgressBar",
  component: GoalProgressBar,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof GoalProgressBar>;

export const ZeroManualProgress: Story = {
  args: {
    progressPercent: 0,
    isMilestoneDerived: false
  }
};

export const HalfwayManualProgress: Story = {
  args: {
    progressPercent: 50,
    isMilestoneDerived: false
  }
};

export const CompletedManualProgress: Story = {
  args: {
    progressPercent: 100,
    isMilestoneDerived: false
  }
};

export const ZeroMilestoneDerived: Story = {
  args: {
    progressPercent: 0,
    isMilestoneDerived: true,
    milestoneCount: 4,
    completedMilestoneCount: 0
  }
};

export const HalfwayMilestoneDerived: Story = {
  args: {
    progressPercent: 50,
    isMilestoneDerived: true,
    milestoneCount: 4,
    completedMilestoneCount: 2
  }
};

export const CompletedMilestoneDerived: Story = {
  args: {
    progressPercent: 100,
    isMilestoneDerived: true,
    milestoneCount: 4,
    completedMilestoneCount: 4
  }
};
