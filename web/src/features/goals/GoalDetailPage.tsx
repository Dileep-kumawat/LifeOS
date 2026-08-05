import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import {
  ArrowLeft,
  Target,
  Calendar,
  CheckSquare,
  Square,
  Trash2,
  Edit,
  Link2
} from "lucide-react";
import { GoalProgressBar } from "./GoalProgressBar";
import { GoalForm, type GoalFormData } from "./GoalForm";
import type { GoalItem } from "./GoalListPage";
import { toast } from "sonner";

export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: goal, isLoading, isError } = useQuery<GoalItem>({
    queryKey: ["goal", id],
    queryFn: async () => {
      const response = await apiClient.get(`/goals/${id}`);
      return response.data;
    },
    enabled: Boolean(id)
  });

  // Optimistic update for toggling a milestone
  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, completed }: { milestoneId: string; completed: boolean }) => {
      const response = await apiClient.patch(`/goals/${id}/milestones/${milestoneId}`, {
        completed
      });
      return response.data;
    },
    onMutate: async ({ milestoneId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["goal", id] });
      const previousGoal = queryClient.getQueryData<GoalItem>(["goal", id]);

      if (previousGoal) {
        const updatedMilestones = previousGoal.milestones.map((m) =>
          m._id === milestoneId ? { ...m, completed } : m
        );
        const doneCount = updatedMilestones.filter((m) => m.completed).length;
        const newProgress = Math.round((doneCount / updatedMilestones.length) * 100);

        queryClient.setQueryData<GoalItem>(["goal", id], {
          ...previousGoal,
          milestones: updatedMilestones,
          progressPercent: newProgress
        });
      }

      return { previousGoal };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousGoal) {
        queryClient.setQueryData(["goal", id], context.previousGoal);
      }
      toast.error(err.response?.data?.message || "Failed to update milestone");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    }
  });

  const editGoalMutation = useMutation({
    mutationFn: async (data: Partial<GoalFormData>) => {
      const response = await apiClient.patch(`/goals/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setIsEditOpen(false);
      toast.success("Goal updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update goal");
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted.");
      navigate("/goals");
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-12 text-sm text-[#615d59]">Loading goal...</div>;
  }

  if (isError || !goal) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#615d59] gap-4">
        <p>Goal not found.</p>
        <Link to="/goals" className="text-xs text-[#0075de] hover:underline">
          Back to Goals list
        </Link>
      </div>
    );
  }

  const hasMilestones = goal.milestones && goal.milestones.length > 0;
  const completedMilestoneCount = goal.milestones
    ? goal.milestones.filter((m) => m.completed).length
    : 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6 px-4">
      {/* Navigation back */}
      <Link
        to="/goals"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#615d59] hover:text-[#0075de] transition-colors"
      >
        <ArrowLeft className="size-4" data-icon="inline-start" />
        Back to Goals
      </Link>

      {/* Goal Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#000000]">{goal.title}</h1>
            <span className="capitalize rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0075de] border border-blue-200">
              {goal.status}
            </span>
          </div>

          {goal.description && <p className="text-sm text-[#615d59]">{goal.description}</p>}

          {goal.targetDate && (
            <div className="flex items-center gap-1.5 text-xs text-[#615d59] mt-1">
              <Calendar className="size-4 text-[#a39e98]" />
              <span>Target Completion: {new Date(goal.targetDate).toLocaleDateString()}</span>
            </div>
          )}
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
              if (confirm("Are you sure you want to delete this goal?")) {
                deleteGoalMutation.mutate();
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
          <GoalForm
            initialValues={goal}
            onSubmit={async (data) => {
              await editGoalMutation.mutateAsync(data);
            }}
            onCancel={() => setIsEditOpen(false)}
            isSubmitting={editGoalMutation.isPending}
          />
        </div>
      )}

      {/* Progress Section */}
      <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-[#000000]">Overall Progress</h2>
        <GoalProgressBar
          progressPercent={goal.progressPercent}
          isMilestoneDerived={hasMilestones}
          milestoneCount={goal.milestones?.length || 0}
          completedMilestoneCount={completedMilestoneCount}
        />
      </div>

      {/* Milestones Checklist */}
      <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-3">
          <h2 className="text-base font-bold text-[#000000] flex items-center gap-2">
            <Target className="size-4 text-[#0075de]" />
            Milestones Checklist
          </h2>
          <span className="text-xs text-[#615d59]">
            {completedMilestoneCount} of {goal.milestones?.length || 0} completed
          </span>
        </div>

        {!hasMilestones ? (
          <p className="text-xs text-[#615d59] py-4 text-center">
            No milestones added yet. Edit this goal to add structured milestone items!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {goal.milestones.map((m) => (
              <button
                key={m._id}
                onClick={() =>
                  m._id &&
                  toggleMilestoneMutation.mutate({
                    milestoneId: m._id,
                    completed: !m.completed
                  })
                }
                className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] p-3 text-left transition-all hover:bg-[#f6f5f4]"
              >
                {m.completed ? (
                  <CheckSquare className="size-5 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="size-5 text-[#a39e98] shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    m.completed ? "line-through text-[#615d59]" : "font-medium text-[#000000]"
                  }`}
                >
                  {m.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Linked Items (Phase 1 References) */}
      <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-sm flex flex-col gap-3">
        <h2 className="text-base font-bold text-[#000000] flex items-center gap-2">
          <Link2 className="size-4 text-[#0075de]" />
          Linked Items (Phase 1)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#615d59]">
          <div className="rounded-lg bg-[#f6f5f4] p-3 border border-[#e6e6e6]">
            <span className="font-semibold text-[#31302e]">Linked Calendar Events:</span>
            <p className="mt-1">
              {goal.linkedEventIds && goal.linkedEventIds.length > 0
                ? `${goal.linkedEventIds.length} event reference(s) attached`
                : "No linked calendar events."}
            </p>
          </div>
          <div className="rounded-lg bg-[#f6f5f4] p-3 border border-[#e6e6e6]">
            <span className="font-semibold text-[#31302e]">Linked Notes:</span>
            <p className="mt-1">
              {goal.linkedNoteIds && goal.linkedNoteIds.length > 0
                ? `${goal.linkedNoteIds.length} note reference(s) attached`
                : "No linked notes."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
