import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/Alert";
import { useConflicts } from "../hooks/useConflicts";

interface ConflictWarningBannerProps {
  startTime?: Date | null;
  endTime?: Date | null;
  excludeEventId?: string;
  excludeOccurrenceId?: string;
}

export function ConflictWarningBanner({
  startTime,
  endTime,
  excludeEventId,
  excludeOccurrenceId
}: ConflictWarningBannerProps) {
  const { data: conflicts = [], isLoading } = useConflicts({
    startTime,
    endTime,
    excludeEventId,
    excludeOccurrenceId
  });

  if (isLoading || conflicts.length === 0) return null;

  const titles = conflicts.map((c) => `${format(new Date(c.startTime), "h:mm a")} ${c.title}`);

  return (
    <Alert variant="destructive">
      <AlertTitle>Time conflict</AlertTitle>
      <AlertDescription>
        {conflicts.length === 1 ? "This overlaps with" : "This overlaps with"} {titles.join(", ")}.
      </AlertDescription>
    </Alert>
  );
}
