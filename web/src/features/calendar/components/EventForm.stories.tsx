import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CalendarEventDetail } from "@lifeos/shared";
import { EventForm } from "./EventForm";

const START = new Date("2026-08-03T13:00:00.000Z");
const END = new Date("2026-08-03T13:30:00.000Z");

function recurringSeries(): CalendarEventDetail {
  return {
    id: "evt-1",
    title: "Weekly design review",
    description: "Stand-up + design sync",
    location: "Zoom",
    startTime: START.toISOString(),
    endTime: END.toISOString(),
    timezone: "America/New_York",
    isAllDay: false,
    isRecurring: true,
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    recurrenceEndDate: null,
    recurrence: {
      frequency: "weekly",
      interval: 1,
      byDay: ["MO"],
      endType: "never"
    }
  };
}

function nonRecurring(): CalendarEventDetail {
  return {
    ...recurringSeries(),
    id: "evt-2",
    title: "One-off client call",
    isRecurring: false,
    recurrenceRule: null,
    recurrenceEndDate: null,
    recurrence: null
  };
}

function seededClient(start: Date, end: Date) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } }
  });
  client.setQueryData(
    ["calendar", "conflicts", { startTime: start.toISOString(), endTime: end.toISOString() }],
    []
  );
  return client;
}

const withClient: Decorator = (Story) => (
  <QueryClientProvider client={seededClient(START, END)}>
    <Story />
  </QueryClientProvider>
);

const meta: Meta<typeof EventForm> = {
  title: "Calendar/EventForm",
  component: EventForm,
  tags: ["autodocs"],
  decorators: [withClient],
  args: {
    open: true,
    onOpenChange: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof EventForm>;

export const CreateEvent: Story = {
  args: {
    initialStart: START,
    initialEnd: END
  }
};

export const EditNonRecurring: Story = {
  args: {
    initialStart: START,
    initialEnd: END,
    event: nonRecurring()
  }
};

export const EditRecurringSeries: Story = {
  args: {
    initialStart: START,
    initialEnd: END,
    event: recurringSeries()
  }
};
