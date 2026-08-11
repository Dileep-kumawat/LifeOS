import type { Meta, StoryObj } from "@storybook/react";
import { ChatMessage } from "./ChatMessage";

const meta: Meta<typeof ChatMessage> = {
  title: "AI/ChatMessage",
  component: ChatMessage,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof ChatMessage>;

export const UserMessage: Story = {
  args: {
    message: {
      id: "msg-1",
      role: "user",
      content: "How productive was I this month?",
      createdAt: "2026-08-11T10:00:00.000Z"
    }
  }
};

export const AITextResponse: Story = {
  args: {
    message: {
      id: "msg-2",
      role: "assistant",
      content: "Based on your habit tracking and calendar check-ins, you completed 85% of your morning meditation habit and attended 14 team sync meetings this month!",
      createdAt: "2026-08-11T10:00:05.000Z"
    }
  }
};

export const ToolCallPending: Story = {
  args: {
    message: {
      id: "msg-3",
      role: "assistant",
      content: "I'd like to schedule a study session for you tomorrow.",
      toolCallData: {
        id: "tc-101",
        toolName: "create_calendar_event",
        args: {
          title: "Study Plan Session",
          startTime: "2026-08-12T10:00:00.000Z",
          endTime: "2026-08-12T11:00:00.000Z",
          location: "Library Room A"
        },
        status: "pending_confirmation"
      },
      createdAt: "2026-08-11T10:01:00.000Z"
    }
  }
};

export const ToolCallConfirmed: Story = {
  args: {
    message: {
      id: "msg-4",
      role: "assistant",
      content: "Event created successfully.",
      toolCallData: {
        id: "tc-101",
        toolName: "create_calendar_event",
        args: {
          title: "Study Plan Session"
        },
        status: "executed",
        result: {
          message: 'Calendar event "Study Plan Session" scheduled successfully.'
        }
      },
      createdAt: "2026-08-11T10:01:10.000Z"
    }
  }
};

export const UncertaintySignal: Story = {
  args: {
    message: {
      id: "msg-5",
      role: "assistant",
      content: "I don't have enough data in your account to answer that. Please add notes or log check-ins regarding your project status.",
      createdAt: "2026-08-11T10:02:00.000Z"
    }
  }
};
