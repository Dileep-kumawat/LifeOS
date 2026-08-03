import type { Meta, StoryObj } from "@storybook/react";
import type { CalendarOccurrence } from "@lifeos/shared";
import { CalendarView } from "./CalendarView";

function occurrence(
  eventId: string,
  startTime: string,
  endTime: string,
  overrides: Partial<CalendarOccurrence> = {}
): CalendarOccurrence {
  return {
    occurrenceId: `${eventId}@${startTime}`,
    eventId,
    title: "Weekly design review",
    description: "",
    location: "Zoom",
    startTime,
    endTime,
    timezone: "America/New_York",
    isAllDay: false,
    isRecurring: true,
    isOverridden: false,
    ...overrides
  };
}

const sampleOccurrences: CalendarOccurrence[] = [
  occurrence("standup", "2026-08-03T13:00:00.000Z", "2026-08-03T13:30:00.000Z", {
    title: "Daily standup"
  }),
  occurrence("standup", "2026-08-04T13:00:00.000Z", "2026-08-04T13:30:00.000Z", {
    title: "Daily standup"
  }),
  occurrence("standup", "2026-08-05T13:00:00.000Z", "2026-08-05T13:30:00.000Z", {
    title: "Daily standup"
  }),
  occurrence("review", "2026-08-06T15:00:00.000Z", "2026-08-06T16:00:00.000Z", {
    title: "Design review",
    location: "Office"
  }),
  occurrence("gym", "2026-08-07T16:30:00.000Z", "2026-08-07T17:30:00.000Z", {
    title: "Gym",
    location: "Fitness club"
  }),
  occurrence("flight", "2026-08-14T08:00:00.000Z", "2026-08-14T11:00:00.000Z", {
    title: "Flight to Lisbon",
    isAllDay: false,
    isRecurring: false,
    location: "Airport"
  }),
  occurrence("birthday", "2026-08-22T00:00:00.000Z", "2026-08-23T00:00:00.000Z", {
    title: "Team offsite",
    isAllDay: true,
    isRecurring: false
  })
];

const meta: Meta<typeof CalendarView> = {
  title: "Calendar/CalendarView",
  component: CalendarView,
  tags: ["autodocs"],
  args: {
    cursor: new Date("2026-08-15T12:00:00"),
    occurrences: sampleOccurrences,
    isLoading: false,
    onSelectDay: () => {},
    onOpenEvent: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof CalendarView>;

export const Month: Story = {
  args: {
    view: "month",
    range: { start: new Date("2026-08-01T00:00:00"), end: new Date("2026-09-01T00:00:00") }
  }
};

export const Week: Story = {
  args: {
    view: "week",
    range: { start: new Date("2026-08-10T00:00:00"), end: new Date("2026-08-17T00:00:00") }
  }
};

export const Day: Story = {
  args: {
    view: "day",
    cursor: new Date("2026-08-14T12:00:00"),
    range: { start: new Date("2026-08-14T00:00:00"), end: new Date("2026-08-15T00:00:00") }
  }
};

export const Loading: Story = {
  args: {
    view: "month",
    isLoading: true
  }
};
