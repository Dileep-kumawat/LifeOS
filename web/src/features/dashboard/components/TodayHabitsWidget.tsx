import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, Activity, Plus } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { toast } from "sonner";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { HabitCardItem } from "../../habits/HabitCard";

export function TodayHabitsWidget() {
  const queryClient = useQueryClient();
  const todayDateStr = new Date().toISOString().split("T")[0];

  // Fetch habits
  const { data: habits = [], isLoading: isHabitsLoading } = useQuery<HabitCardItem[]>({
    queryKey: ["habits"],
    queryFn: async () => {
      const response = await apiClient.get("/habits");
      return response.data;
    }
  });

  // Fetch today's checkins
  const { data: recentCheckIns = [] } = useQuery<
    Array<{ habitId: string; date: string; completed: boolean }>
  >({
    queryKey: ["habits-recent-checkins", todayDateStr],
    queryFn: async () => {
      if (habits.length === 0) return [];
      const promises = habits.map((h) =>
        apiClient
          .get(`/habits/${h._id}/check-ins?startDate=${todayDateStr}&endDate=${todayDateStr}`)
          .then((res) => res.data.map((c: any) => ({ ...c, habitId: h._id })))
          .catch(() => [])
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: habits.length > 0
  });

  // Toggle check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async ({
      habitId,
      date,
      completed
    }: {
      habitId: string;
      date: string;
      completed: boolean;
    }) => {
      const response = await apiClient.post(`/habits/${habitId}/check-in`, { date, completed });
      return response.data;
    },
    onMutate: async ({ habitId, date, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["habits-recent-checkins"] });

      const prevCheckIns = queryClient.getQueryData<any[]>(["habits-recent-checkins", todayDateStr]) || [];

      const updatedCheckIns = prevCheckIns.filter(
        (c) => !(c.habitId === habitId && c.date === date)
      );
      updatedCheckIns.push({ habitId, date, completed });

      queryClient.setQueryData(["habits-recent-checkins", todayDateStr], updatedCheckIns);

      return { prevCheckIns };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevCheckIns) {
        queryClient.setQueryData(["habits-recent-checkins", todayDateStr], context.prevCheckIns);
      }
      toast.error("Failed to update habit status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-recent-checkins"] });
    }
  });

  const getIsCompleted = (habitId: string) => {
    return (
      recentCheckIns.find((c) => c.habitId === habitId && c.date === todayDateStr)?.completed ??
      false
    );
  };

  const completedCount = habits.filter((h) => getIsCompleted(h._id)).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Activity className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">Habit Tracker</h3>
              {habits.length > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {completedCount}/{habits.length} Done
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Daily progress</p>
          </div>
        </div>

        <Link
          to="/habits"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
        >
          View All <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="mb-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>Progress Today</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {isHabitsLoading ? (
        <div className="flex flex-col gap-2 py-1">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">No habits set up yet.</p>
          <Link
            to="/habits"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-3.5" />
            Create Habit
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.slice(0, 6).map((habit) => {
            const isCompleted = getIsCompleted(habit._id);
            const freqLabel =
              typeof habit.frequency === "string"
                ? habit.frequency
                : habit.frequency?.type || "daily";

            return (
              <li
                key={habit._id}
                onClick={() =>
                  checkInMutation.mutate({
                    habitId: habit._id,
                    date: todayDateStr,
                    completed: !isCompleted
                  })
                }
                className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                  isCompleted
                    ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                    : "border-border/40 bg-accent/20 hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    className="text-emerald-600 transition-transform active:scale-90"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-5 text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                    )}
                  </button>
                  <span
                    className={`text-xs font-medium truncate transition-colors ${
                      isCompleted
                        ? "text-muted-foreground line-through"
                        : "text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                    }`}
                  >
                    {habit.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {habit.currentStreak ? (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      🔥 {habit.currentStreak}d
                    </span>
                  ) : null}
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/50">
                    {freqLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
