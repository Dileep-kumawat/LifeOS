import type { Meta, StoryObj } from "@storybook/react";
import { ToolConfirmationModal } from "./ToolConfirmationModal";

const meta: Meta<typeof ToolConfirmationModal> = {
  title: "AI/ToolConfirmationModal",
  component: ToolConfirmationModal,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof ToolConfirmationModal>;

export const EventCreation: Story = {
  args: {
    isOpen: true,
    toolCall: {
      id: "tc-101",
      toolName: "create_calendar_event",
      args: {
        title: "Dentist Appointment",
        startTime: "2026-08-14T14:00:00.000Z",
        endTime: "2026-08-14T15:00:00.000Z",
        location: "Main Street Dental Clinic",
        timezone: "America/New_York"
      },
      status: "pending_confirmation"
    },
    onConfirm: () => {},
    onCancel: () => {}
  }
};

export const NoteCreation: Story = {
  args: {
    isOpen: true,
    toolCall: {
      id: "tc-102",
      toolName: "create_note",
      args: {
        title: "Meeting Summary — Project Alpha",
        content: "Reviewed key milestones for Q3. Agreed to launch beta tests next week.",
        tags: ["work", "project-alpha"]
      },
      status: "pending_confirmation"
    },
    onConfirm: () => {},
    onCancel: () => {}
  }
};

export const HabitCreation: Story = {
  args: {
    isOpen: true,
    toolCall: {
      id: "tc-103",
      toolName: "create_habit",
      args: {
        title: "Read 20 pages of a book",
        frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 },
        reminderTime: "21:00"
      },
      status: "pending_confirmation"
    },
    onConfirm: () => {},
    onCancel: () => {}
  }
};

export const ExecutingState: Story = {
  args: {
    isOpen: true,
    isExecuting: true,
    toolCall: {
      id: "tc-101",
      toolName: "create_calendar_event",
      args: {
        title: "Dentist Appointment",
        startTime: "2026-08-14T14:00:00.000Z",
        endTime: "2026-08-14T15:00:00.000Z"
      },
      status: "pending_confirmation"
    },
    onConfirm: () => {},
    onCancel: () => {}
  }
};

export const CancelledState: Story = {
  args: {
    isOpen: false,
    toolCall: {
      id: "tc-104",
      toolName: "create_note",
      args: {
        title: "Declined Note Entry",
        content: "User chose not to proceed with note creation."
      },
      status: "cancelled"
    },
    onConfirm: () => {},
    onCancel: () => {}
  }
};
