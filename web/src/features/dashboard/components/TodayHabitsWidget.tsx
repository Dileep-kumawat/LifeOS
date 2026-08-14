import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Activity, Plus } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-[#e6e6e6] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[20px] font-bold text-[#1a1c1c] flex items-center gap-2">
          <Activity className="size-5 text-[#717784]" />
          Daily Habits
        </h3>
        <Link
          to="/habits"
          className="text-[#005db2] text-sm font-semibold hover:underline transition-colors"
        >
          View All
        </Link>
      </div>

      {isHabitsLoading ? (
        <div className="flex flex-col gap-2 py-1 mb-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center mb-4">
          <p className="text-xs text-[#717784] mb-3">No habits set up yet.</p>
          <Link
            to="/habits"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-[#faf9f8] px-3.5 py-1.5 text-xs font-semibold text-[#1a1c1c] hover:bg-[#e9e8e7] transition-colors"
          >
            <Plus className="size-3.5" />
            Create Habit
          </Link>
        </div>
      ) : (
        <div className="space-y-4 border-b border-[#e3e2e1] pb-4 mb-4">
          {habits.slice(0, 6).map((habit) => {
            const isCompleted = getIsCompleted(habit._id);

            return (
              <div
                key={habit._id}
                onClick={() =>
                  checkInMutation.mutate({
                    habitId: habit._id,
                    date: todayDateStr,
                    completed: !isCompleted
                  })
                }
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    className={`size-6 rounded flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600 font-bold"
                        : "border-[#c1c6d5] hover:border-[#005db2] bg-white text-transparent"
                    }`}
                  >
                    <CheckCircle2 className={`size-4 ${isCompleted ? "opacity-100" : "opacity-0"}`} />
                  </button>
                  <span
                    className={`text-sm font-medium transition-colors truncate ${
                      isCompleted ? "line-through text-[#717784]" : "text-[#1a1c1c]"
                    }`}
                  >
                    {habit.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {habit.currentStreak ? (
                    <span className="text-xs text-[#717784] px-2.5 py-0.5 rounded-full bg-[#efeeed] font-medium">
                      {habit.currentStreak} Day Streak
                    </span>
                  ) : (
                    <span className="text-xs text-[#717784] px-2.5 py-0.5 rounded-full bg-[#efeeed] font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mini Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-[#717784] font-medium mb-1">
          <span>Completion</span>
          <span className="font-bold text-[#005db2]">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#efeeed] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

