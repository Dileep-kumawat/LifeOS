import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import {
  ArrowLeft,
  Flame,
  Trophy,
  Activity,
  Calendar,
  Check,
  X,
  Trash2,
  Edit
} from "lucide-react";
import { HabitStreakBadge } from "./HabitStreakBadge";
import { HabitForm, type HabitFormData } from "./HabitForm";
import type { HabitCardItem } from "./HabitCard";
import { toast } from "sonner";

export function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const todayDateStr = new Date().toISOString().split("T")[0];

  // Past 60 days for calendar heatmap
  const d = new Date();
  d.setDate(d.getDate() - 60);
  const startDateStr = d.toISOString().split("T")[0];

  const { data: habit, isLoading: isHabitLoading } = useQuery<HabitCardItem>({
    queryKey: ["habit", id],
    queryFn: async () => {
      const response = await apiClient.get(`/habits/${id}`);
      return response.data;
    },
    enabled: Boolean(id)
  });

  const { data: checkIns = [] } = useQuery<Array<{ date: string; completed: boolean }>>({
    queryKey: ["habit-checkins", id],
    queryFn: async () => {
      const response = await apiClient.get(
        `/habits/${id}/check-ins?startDate=${startDateStr}&endDate=${todayDateStr}`
      );
      return response.data;
    },
    enabled: Boolean(id)
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ date, completed }: { date: string; completed: boolean }) => {
      const response = await apiClient.post(`/habits/${id}/check-in`, { date, completed });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit", id] });
      queryClient.invalidateQueries({ queryKey: ["habit-checkins", id] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update check-in");
    }
  });

  const updateHabitMutation = useMutation({
    mutationFn: async (data: Partial<HabitFormData>) => {
      const response = await apiClient.patch(`/habits/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit", id] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      setIsEditOpen(false);
      toast.success("Habit updated!");
    }
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/habits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Habit deleted.");
      navigate("/habits");
    }
  });

  if (isHabitLoading) {
    return <div className="flex justify-center py-12 text-sm text-[#615d59]">Loading habit details...</div>;
  }

  if (!habit) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#615d59] gap-4">
        <p>Habit not found.</p>
        <Link to="/habits" className="text-xs text-[#0075de] hover:underline">
          Back to Habits list
        </Link>
      </div>
    );
  }

  // Generate 60-day calendar matrix
  const daysList: Array<{ dateStr: string; dayNumber: number; monthLabel: string; record?: { completed: boolean } }> = [];
  const [y, m, dayNum] = todayDateStr.split("-").map(Number);

  for (let i = 59; i >= 0; i--) {
    const curDate = new Date(Date.UTC(y, m - 1, dayNum - i));
    const dateStr = curDate.toISOString().split("T")[0];
    const record = checkIns.find((c) => c.date === dateStr);
    const monthLabel = curDate.toLocaleString("default", { month: "short" });
    daysList.push({
      dateStr,
      dayNumber: curDate.getUTCDate(),
      monthLabel,
      record
    });
  }

  const todayRecord = checkIns.find((c) => c.date === todayDateStr);
  const isCheckedInToday = todayRecord?.completed === true;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6 px-4">
      {/* Back button */}
      <Link
        to="/habits"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#615d59] hover:text-[#0075de] transition-colors"
      >
        <ArrowLeft className="size-4" data-icon="inline-start" />
        Back to Habits
      </Link>

      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#000000]">{habit.title}</h1>
            <HabitStreakBadge
              currentStreak={habit.currentStreak}
              longestStreak={habit.longestStreak}
              isCheckedInToday={isCheckedInToday}
              frequencyType={habit.frequency.type}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-[#615d59] mt-1">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5 text-[#a39e98]" />
              <span className="capitalize">
                {habit.frequency.type === "custom"
                  ? `${habit.frequency.timesPerPeriod}x per week`
                  : habit.frequency.type}
              </span>
            </span>
            <span>•</span>
            <span>Last Check-In: {habit.lastCheckInDate || "None"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-white px-3 py-1.5 text-xs font-semibold text-[#31302e] hover:bg-[#f6f5f4]"
          >
            <Edit className="size-3.5" data-icon="inline-start" />
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this habit and all check-in history?")) {
                deleteHabitMutation.mutate();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-3.5" data-icon="inline-start" />
            Delete
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <HabitForm
            initialValues={habit}
            onSubmit={async (data) => {
              await updateHabitMutation.mutateAsync(data);
            }}
            onCancel={() => setIsEditOpen(false)}
            isSubmitting={updateHabitMutation.isPending}
          />
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#615d59] flex items-center gap-1.5">
            <Flame className="size-4 text-orange-500" />
            Current Streak
          </span>
          <span className="text-2xl font-bold text-[#000000]">
            {habit.currentStreak} {habit.frequency.type === "daily" ? "Days" : "Weeks"}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#615d59] flex items-center gap-1.5">
            <Trophy className="size-4 text-purple-600" />
            Longest Streak (High Water Mark)
          </span>
          <span className="text-2xl font-bold text-[#000000]">
            {habit.longestStreak} {habit.frequency.type === "daily" ? "Days" : "Weeks"}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#615d59] flex items-center gap-1.5">
            <Activity className="size-4 text-[#0075de]" />
            30-Day Completion Rate
          </span>
          <span className="text-2xl font-bold text-[#000000]">
            {Math.round((habit.completionRate || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* 60-Day Calendar Heatmap Grid */}
      <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-3">
          <h2 className="text-base font-bold text-[#000000]">60-Day Check-in History</h2>
          <div className="flex items-center gap-3 text-xs text-[#615d59]">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-emerald-500 border border-emerald-600" /> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-rose-500 border border-rose-600" /> Missed
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-[#f6f5f4] border border-[#e6e6e6]" /> None
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 gap-2">
          {daysList.map((item) => {
            const isCompleted = item.record?.completed === true;
            const isMissed = item.record?.completed === false;
            const isToday = item.dateStr === todayDateStr;

            let tileClass = "bg-[#f6f5f4] text-[#615d59] border-[#e6e6e6] hover:bg-[#e6e6e6]";
            if (isCompleted) {
              tileClass = "bg-emerald-500 text-white border-emerald-600 shadow-sm";
            } else if (isMissed) {
              tileClass = "bg-rose-500 text-white border-rose-600 shadow-sm";
            }

            if (isToday) {
              tileClass += " ring-2 ring-[#0075de]";
            }

            return (
              <button
                key={item.dateStr}
                onClick={() => {
                  // Toggle check-in state on click
                  const nextState = isCompleted ? false : true;
                  checkInMutation.mutate({ date: item.dateStr, completed: nextState });
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${tileClass}`}
                title={`${item.dateStr}: ${
                  isCompleted ? "Completed" : isMissed ? "Missed" : "No record"
                } (Click to toggle)`}
              >
                <span className="text-[10px] opacity-80">{item.monthLabel}</span>
                <span className="text-sm font-bold">{item.dayNumber}</span>
                <div className="mt-0.5">
                  {isCompleted ? (
                    <Check className="size-3 stroke-[3]" />
                  ) : isMissed ? (
                    <X className="size-3 stroke-[3]" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
