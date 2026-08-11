import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Plus, Target, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { GoalProgressBar } from "./GoalProgressBar";
import { GoalForm, type GoalFormData } from "./GoalForm";
import { toast } from "sonner";

export interface GoalItem {
  _id: string;
  title: string;
  description: string;
  targetDate?: string;
  status: "active" | "completed" | "abandoned";
  progressPercent: number;
  milestones: Array<{ _id?: string; title: string; completed: boolean; order: number }>;
  linkedEventIds: string[];
  linkedNoteIds: string[];
}

export function GoalListPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    data: goals = [],
    isLoading,
    isError
  } = useQuery<GoalItem[]>({
    queryKey: ["goals", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/goals" : `/goals?status=${statusFilter}`;
      const response = await apiClient.get(url);
      return response.data;
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: Partial<GoalFormData>) => {
      const response = await apiClient.post("/goals", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setIsFormOpen(false);
      toast.success("Goal created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create goal");
    }
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6e6e6] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#000000] flex items-center gap-2">
            <Target className="size-6 text-[#0075de]" />
            Goals
          </h1>
          <p className="text-xs text-[#615d59] mt-1">
            Track high-level objectives, milestones, and progress.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0075de] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#005bab] transition-all"
        >
          <Plus className="size-4" data-icon="inline-start" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["all", "active", "completed", "abandoned"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
              statusFilter === tab
                ? "bg-[#0075de] text-white shadow-sm"
                : "bg-white text-[#615d59] border border-[#e6e6e6] hover:bg-[#f6f5f4]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Goal Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <GoalForm
            onSubmit={async (data) => {
              await createGoalMutation.mutateAsync(data);
            }}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={createGoalMutation.isPending}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12 text-sm text-[#615d59]">Loading goals...</div>
      ) : isError ? (
        <div className="flex justify-center py-12 text-sm text-red-500">Failed to load goals.</div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e6e6e6] bg-[#f6f5f4] p-12 text-center">
          <Target className="size-12 text-[#a39e98] mb-3" />
          <h3 className="text-base font-semibold text-[#000000]">No goals found</h3>
          <p className="text-xs text-[#615d59] max-w-sm mt-1 mb-4">
            {statusFilter === "all"
              ? "You haven't set any goals yet. Start by defining your first objective!"
              : `No goals found with status '${statusFilter}'.`}
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0075de] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005bab]"
          >
            <Plus className="size-4" data-icon="inline-start" />
            Create Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const hasMilestones = goal.milestones && goal.milestones.length > 0;
            const completedCount = goal.milestones
              ? goal.milestones.filter((m) => m.completed).length
              : 0;

            return (
              <div
                key={goal._id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-[#e6e6e6] bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/goals/${goal._id}`}
                      className="text-base font-bold text-[#000000] hover:text-[#0075de] transition-colors"
                    >
                      {goal.title}
                    </Link>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                        goal.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : goal.status === "abandoned"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-blue-50 text-[#0075de] border-blue-200"
                      }`}
                    >
                      {goal.status === "completed" ? (
                        <CheckCircle2 className="size-3" />
                      ) : goal.status === "abandoned" ? (
                        <AlertCircle className="size-3" />
                      ) : (
                        <Target className="size-3" />
                      )}
                      <span className="capitalize">{goal.status}</span>
                    </span>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-[#615d59] line-clamp-2">{goal.description}</p>
                  )}

                  {goal.targetDate && (
                    <div className="flex items-center gap-1.5 text-xs text-[#615d59]">
                      <Calendar className="size-3.5 text-[#a39e98]" />
                      <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <GoalProgressBar
                  progressPercent={goal.progressPercent}
                  isMilestoneDerived={hasMilestones}
                  milestoneCount={goal.milestones?.length || 0}
                  completedMilestoneCount={completedCount}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
