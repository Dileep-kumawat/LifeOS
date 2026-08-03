import type { Meta, StoryObj } from "@storybook/react";
import type { CalendarOccurrence } from "@lifeos/shared";
import { EventCard } from "./EventCard";

function occurrence(overrides: Partial<CalendarOccurrence> = {}): CalendarOccurrence {
  return {
    occurrenceId: "evt1@2026-08-03T13:00:00.000Z",
    eventId: "evt1",
    title: "Weekly design review",
    description: "",
    location: "Zoom",
    startTime: "2026-08-03T13:00:00.000Z",
    endTime: "2026-08-03T13:30:00.000Z",
    timezone: "America/New_York",
    isAllDay: false,
    isRecurring: true,
    isOverridden: false,
    ...overrides
  };
}

const meta: Meta<typeof EventCard> = {
  title: "Calendar/EventCard",
  component: EventCard,
  tags: ["autodocs"],
  args: {
    occurrence: occurrence(),
    onOpen: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof EventCard>;

export const Chip: Story = {
  args: { variant: "chip" }
};

export const ChipAllDay: Story = {
  args: {
    variant: "chip",
    occurrence: occurrence({ isAllDay: true, title: "Public holiday" })
  }
};

export const Block: Story = {
  args: { variant: "block" }
};

export const BlockOverridden: Story = {
  args: {
    variant: "block",
    occurrence: occurrence({
      isOverridden: true,
      title: "Standup (moved to 15:00)",
      startTime: "2026-08-03T15:00:00.000Z",
      endTime: "2026-08-03T15:45:00.000Z"
    })
  }
};
