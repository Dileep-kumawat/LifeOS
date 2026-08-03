import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CalendarOccurrence } from "@lifeos/shared";
import { ConflictWarningBanner } from "./ConflictWarningBanner";

const START = new Date("2026-08-03T13:00:00.000Z");
const END = new Date("2026-08-03T13:30:00.000Z");

function occurrence(overrides: Partial<CalendarOccurrence> = {}): CalendarOccurrence {
  return {
    occurrenceId: "evt2@2026-08-03T13:00:00.000Z",
    eventId: "evt2",
    title: "Sprint planning",
    description: "",
    location: "",
    startTime: "2026-08-03T13:15:00.000Z",
    endTime: "2026-08-03T14:00:00.000Z",
    timezone: "America/New_York",
    isAllDay: false,
    isRecurring: false,
    isOverridden: false,
    ...overrides
  };
}

function seededClient(conflicts: CalendarOccurrence[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } }
  });
  client.setQueryData(
    ["calendar", "conflicts", { startTime: START.toISOString(), endTime: END.toISOString() }],
    conflicts
  );
  return client;
}

const withSeededClient: Decorator = (Story) => (
  <QueryClientProvider client={seededClient([])}>
    <Story />
  </QueryClientProvider>
);

const meta: Meta<typeof ConflictWarningBanner> = {
  title: "Calendar/ConflictWarningBanner",
  component: ConflictWarningBanner,
  tags: ["autodocs"],
  decorators: [withSeededClient],
  args: { startTime: START, endTime: END }
};

export default meta;
type Story = StoryObj<typeof ConflictWarningBanner>;

export const NoConflicts: Story = {
  args: {}
};

export const WithConflicts: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider
        client={seededClient([
          occurrence(),
          occurrence({
            title: "1:1 with manager",
            startTime: "2026-08-03T12:45:00.000Z",
            endTime: "2026-08-03T13:15:00.000Z"
          })
        ])}
      >
        <Story />
      </QueryClientProvider>
    )
  ]
};
