import { useEffect, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { buildRruleString } from "@lifeos/shared";
import type { CalendarEventDetail, CalendarOccurrence, RecurrenceDescriptor } from "@lifeos/shared";
import { Alert, AlertDescription } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { Label } from "../../../components/ui/Label";
import { ConflictWarningBanner } from "./ConflictWarningBanner";
import { RepeatRuleBuilder } from "./RepeatRuleBuilder";
import { RecurringEventPrompt, type RecurrenceScope } from "./RecurringEventPrompt";
import {
  useCreateEvent,
  useDeleteEvent,
  useDeleteOccurrence,
  useUpdateEvent,
  useUpdateOccurrence
} from "../hooks/useCalendarEvents";

const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const DEFAULT_DESCRIPTOR: RecurrenceDescriptor = {
  frequency: "weekly",
  interval: 1,
  byDay: [],
  endType: "never"
};

interface FormValues {
  title: string;
  description: string;
  location: string;
  isAllDay: boolean;
  start: Date;
  end: Date;
  repeat: boolean;
  descriptor: RecurrenceDescriptor;
}

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStart?: Date;
  initialEnd?: Date;
  event?: CalendarEventDetail | null;
  occurrence?: CalendarOccurrence | null;
  onSaved?: () => void;
}

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function defaultTimes(initialStart?: Date, initialEnd?: Date): { start: Date; end: Date } {
  const start = initialStart ?? defaultStart();
  return { start, end: initialEnd ?? addHours(start, 1) };
}

function toDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function toDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  return err instanceof Error && err.message
    ? err.message
    : "Something went wrong. Please try again.";
}

export function EventForm({
  open,
  onOpenChange,
  initialStart,
  initialEnd,
  event,
  occurrence,
  onSaved
}: EventFormProps) {
  const [values, setValues] = useState<FormValues>(() => ({
    ...defaultTimes(initialStart, initialEnd),
    title: "",
    description: "",
    location: "",
    isAllDay: false,
    repeat: false,
    descriptor: DEFAULT_DESCRIPTOR
  }));
  const [scope, setScope] = useState<RecurrenceScope>(occurrence ? "occurrence" : "series");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isCreate = !event;
  const isOccurrenceEdit = !!event && !!occurrence;
  const showRecurrenceControls = isCreate || !isOccurrenceEdit || scope === "series";
  const showRecurringPrompt = !!event && !!event.recurrence && isOccurrenceEdit;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmingDelete(false);
    setScope(occurrence ? "occurrence" : "series");
    if (event) {
      setValues({
        title: event.title,
        description: event.description,
        location: event.location,
        isAllDay: event.isAllDay,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        repeat: !!event.recurrence,
        descriptor: event.recurrence ?? DEFAULT_DESCRIPTOR
      });
    } else {
      setValues({
        ...defaultTimes(initialStart, initialEnd),
        title: "",
        description: "",
        location: "",
        isAllDay: false,
        repeat: false,
        descriptor: DEFAULT_DESCRIPTOR
      });
    }
  }, [open, event?.id, occurrence?.occurrenceId]);

  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const updateOccurrenceMutation = useUpdateOccurrence();
  const deleteEventMutation = useDeleteEvent();
  const deleteOccurrenceMutation = useDeleteOccurrence();

  const recurrenceRule = values.repeat ? buildRruleString(values.descriptor) : null;
  const recurrenceEndDate =
    values.repeat && values.descriptor.endType === "onDate" && values.descriptor.until
      ? new Date(values.descriptor.until).toISOString()
      : null;

  const handleToggleAllDay = (checked: boolean) => {
    setValues((v) => {
      if (checked) {
        const start = startOfDay(v.start);
        return { ...v, isAllDay: true, start, end: addDays(start, 1) };
      }
      return { ...v, isAllDay: false, end: addHours(v.start, 1) };
    });
  };

  const handleSave = async () => {
    setError(null);
    if (!values.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (values.start >= values.end) {
      setError("End time must be after the start time.");
      return;
    }

    const payload = {
      title: values.title.trim(),
      description: values.description,
      location: values.location,
      startTime: values.start.toISOString(),
      endTime: values.end.toISOString(),
      isAllDay: values.isAllDay
    };

    try {
      if (isOccurrenceEdit && scope === "occurrence") {
        await updateOccurrenceMutation.mutateAsync({
          eventId: event.id,
          occurrenceId: occurrence.occurrenceId,
          input: payload
        });
      } else if (!isCreate) {
        await updateEventMutation.mutateAsync({
          eventId: event.id,
          input: {
            ...payload,
            timezone: BROWSER_TIMEZONE,
            recurrenceRule,
            recurrenceEndDate,
            scope: "series"
          }
        });
      } else {
        await createEventMutation.mutateAsync({
          ...payload,
          timezone: BROWSER_TIMEZONE,
          recurrenceRule,
          recurrenceEndDate
        });
      }
      toast.success(isCreate ? "Event created" : "Event updated");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    try {
      if (isOccurrenceEdit && scope === "occurrence") {
        await deleteOccurrenceMutation.mutateAsync({
          eventId: event.id,
          occurrenceId: occurrence.occurrenceId
        });
      } else {
        await deleteEventMutation.mutateAsync(event.id);
      }
      toast.success("Deleted");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const changeStart = (value: string) => {
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return;
    const duration = values.end.getTime() - values.start.getTime();
    setValues((v) => ({ ...v, start: next, end: new Date(next.getTime() + duration) }));
  };

  const changeAllDayStart = (value: string) => {
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return;
    setValues((v) => ({ ...v, start: startOfDay(next), end: addDays(startOfDay(next), 1) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isCreate ? "New event" : "Edit event"}</DialogTitle>
        <DialogDescription>Times are shown in {BROWSER_TIMEZONE}.</DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-title">Title</Label>
          <Input
            id="event-title"
            value={values.title}
            placeholder="e.g. Weekly design review"
            autoFocus
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#31302e]">
          <input
            type="checkbox"
            checked={values.isAllDay}
            onChange={(e) => handleToggleAllDay(e.target.checked)}
            className="size-4 accent-[#0075de]"
          />
          All day
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-start">Start</Label>
            <Input
              id="event-start"
              type={values.isAllDay ? "date" : "datetime-local"}
              value={values.isAllDay ? toDateInput(values.start) : toDateTimeLocal(values.start)}
              onChange={(e) =>
                values.isAllDay ? changeAllDayStart(e.target.value) : changeStart(e.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-end">End</Label>
            {values.isAllDay ? (
              <Input
                id="event-end"
                type="date"
                value={toDateInput(values.end)}
                onChange={(e) => changeAllDayStart(e.target.value)}
              />
            ) : (
              <Input
                id="event-end"
                type="datetime-local"
                value={toDateTimeLocal(values.end)}
                min={toDateTimeLocal(values.start)}
                onChange={(e) => {
                  const next = new Date(e.target.value);
                  if (!Number.isNaN(next.getTime())) setValues((v) => ({ ...v, end: next }));
                }}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            value={values.location}
            placeholder="e.g. Zoom, Office, Home"
            onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-description">Description</Label>
          <textarea
            id="event-description"
            value={values.description}
            rows={3}
            placeholder="Optional notes"
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            className="w-full rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] placeholder:text-[#a39e98] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de] focus-visible:border-transparent"
          />
        </div>

        {showRecurringPrompt && (
          <div className="flex flex-col gap-2">
            <Label>Apply to</Label>
            <RecurringEventPrompt value={scope} onChange={setScope} />
          </div>
        )}

        {showRecurrenceControls && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-[#31302e]">
              <input
                type="checkbox"
                checked={values.repeat}
                onChange={(e) => setValues((v) => ({ ...v, repeat: e.target.checked }))}
                className="size-4 accent-[#0075de]"
              />
              Repeat
            </label>
            {values.repeat && (
              <RepeatRuleBuilder
                value={values.descriptor}
                onChange={(descriptor) => setValues((v) => ({ ...v, descriptor }))}
              />
            )}
          </div>
        )}

        <ConflictWarningBanner
          startTime={values.start}
          endTime={values.end}
          excludeEventId={event?.id}
          excludeOccurrenceId={isOccurrenceEdit ? occurrence.occurrenceId : undefined}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        {!isCreate && (
          <Button
            variant="destructive"
            className="mr-auto"
            isLoading={deleteEventMutation.isPending || deleteOccurrenceMutation.isPending}
            onClick={handleDelete}
          >
            {confirmingDelete ? "Confirm delete" : "Delete"}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={createEventMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          isLoading={
            createEventMutation.isPending ||
            updateEventMutation.isPending ||
            updateOccurrenceMutation.isPending
          }
          onClick={handleSave}
        >
          {isCreate ? "Create event" : "Save changes"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
