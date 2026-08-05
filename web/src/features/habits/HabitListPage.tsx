import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Plus, Activity } from "lucide-react";
import { HabitCard, type HabitCardItem } from "./HabitCard";
import { HabitForm, type HabitFormData } from "./HabitForm";
import { toast } from "sonner";

export function HabitListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitCardItem | null>(null);

  const todayDateStr = new Date().toISOString().split("T")[0];

  const { data: habits = [], isLoading, isError } = useQuery<HabitCardItem[]>({
    queryKey: ["habits"],
    queryFn: async () => {
      const response = await apiClient.get("/habits");
      return response.data;
    }
  });

  // Fetch recent check-ins for active habits over past 7 days
  const { data: recentCheckIns = [] } = useQuery<Array<{ habitId: string; date: string; completed: boolean }>>({
    queryKey: ["habits-recent-checkins", todayDateStr],
    queryFn: async () => {
      // Fetch checkins for each habit or aggregate
      if (habits.length === 0) return [];
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const startDate = d.toISOString().split("T")[0];

      const promises = habits.map((h) =>
        apiClient
          .get(`/habits/${h._id}/check-ins?startDate=${startDate}&endDate=${todayDateStr}`)
          .then((res) => res.data.map((c: any) => ({ ...c, habitId: h._id })))
          .catch(() => [])
      );

      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: habits.length > 0
  });

  // Check-in toggle mutation with Optimistic Update
  const checkInMutation = useMutation({
    mutationFn: async ({ habitId, date, completed }: { habitId: string; date: string; completed: boolean }) => {
      const response = await apiClient.post(`/habits/${habitId}/check-in`, { date, completed });
      return response.data;
    },
    onMutate: async ({ habitId, date, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] });
      await queryClient.cancelQueries({ queryKey: ["habits-recent-checkins"] });

      const prevHabits = queryClient.getQueryData<HabitCardItem[]>(["habits"]);
      const prevCheckIns = queryClient.getQueryData<any[]>(["habits-recent-checkins", todayDateStr]) || [];

      // Optimistically update recent check-in list
      const updatedCheckIns = prevCheckIns.filter(
        (c) => !(c.habitId === habitId && c.date === date)
      );
      updatedCheckIns.push({ habitId, date, completed });

      queryClient.setQueryData(["habits-recent-checkins", todayDateStr], updatedCheckIns);

      return { prevHabits, prevCheckIns };
    },
    onError: (err: any, _vars, context) => {
      if (context?.prevCheckIns) {
        queryClient.setQueryData(["habits-recent-checkins", todayDateStr], context.prevCheckIns);
      }
      toast.error(err.response?.data?.message || "Failed to log check-in");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-recent-checkins"] });
    }
  });

  const createHabitMutation = useMutation({
    mutationFn: async (data: Partial<HabitFormData>) => {
      const response = await apiClient.post("/habits", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      setIsFormOpen(false);
      toast.success("Habit created!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create habit");
    }
  });

  const updateHabitMutation = useMutation({
    mutationFn: async (data: Partial<HabitFormData>) => {
      const response = await apiClient.patch(`/habits/${editingHabit?._id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      setEditingHabit(null);
      toast.success("Habit updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update habit");
    }
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      await apiClient.delete(`/habits/${habitId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Habit deleted.");
    }
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6e6e6] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#000000] flex items-center gap-2">
            <Activity className="size-6 text-[#0075de]" />
            Habits & Routines
          </h1>
          <p className="text-xs text-[#615d59] mt-1">
            Build consistency with daily and weekly habit tracking.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingHabit(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0075de] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#005bab] transition-all"
        >
          <Plus className="size-4" data-icon="inline-start" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habit Creation Modal */}
      {(isFormOpen || editingHabit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <HabitForm
            initialValues={editingHabit || undefined}
            onSubmit={async (data) => {
              if (editingHabit) {
                await updateHabitMutation.mutateAsync(data);
              } else {
                await createHabitMutation.mutateAsync(data);
              }
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingHabit(null);
            }}
            isSubmitting={createHabitMutation.isPending || updateHabitMutation.isPending}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12 text-sm text-[#615d59]">Loading habits...</div>
      ) : isError ? (
        <div className="flex justify-center py-12 text-sm text-red-500">Failed to load habits.</div>
      ) : habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e6e6e6] bg-[#f6f5f4] p-12 text-center">
          <Activity className="size-12 text-[#a39e98] mb-3" />
          <h3 className="text-base font-semibold text-[#000000]">No habits tracked yet</h3>
          <p className="text-xs text-[#615d59] max-w-sm mt-1 mb-4">
            Build routine habits with custom frequencies, daily check-ins, and automated streak tracking.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0075de] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005bab]"
          >
            <Plus className="size-4" data-icon="inline-start" />
            Create First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((habit) => {
            const habitCheckIns = recentCheckIns.filter((c) => c.habitId === habit._id);

            return (
              <HabitCard
                key={habit._id}
                habit={habit}
                todayDateStr={todayDateStr}
                recentCheckIns={habitCheckIns}
                onToggleCheckIn={(habitId, date, completed) =>
                  checkInMutation.mutate({ habitId, date, completed })
                }
                onSelectHabit={(id) => navigate(`/habits/${id}`)}
                onEditHabit={(h) => setEditingHabit(h)}
                onDeleteHabit={(id) => {
                  if (confirm("Delete this habit and all check-in history?")) {
                    deleteHabitMutation.mutate(id);
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
