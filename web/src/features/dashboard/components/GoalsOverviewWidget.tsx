import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Target, ArrowRight, Plus, Flag } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { GoalItem } from "../../goals/GoalListPage";

export function GoalsOverviewWidget() {
  const { data: goals = [], isLoading, isError } = useQuery<GoalItem[]>({
    queryKey: ["goals"],
    queryFn: async () => {
      const response = await apiClient.get("/goals");
      return response.data;
    }
  });

  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Target className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">Active Goals</h3>
              {activeGoals.length > 0 && (
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  {activeGoals.length} Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Milestones and targets</p>
          </div>
        </div>

        <Link
          to="/goals"
          className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 transition-colors"
        >
          View All <ArrowRight className="size-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-1">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Unable to load goals.</p>
      ) : activeGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">No active goals tracked.</p>
          <Link
            to="/goals"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-3.5" />
            Set New Goal
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {activeGoals.slice(0, 4).map((goal) => {
            const completedMilestones = (goal.milestones || []).filter((m) => m.completed).length;
            const totalMilestones = (goal.milestones || []).length;
            const progress = goal.progressPercent ?? (totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0);

            return (
              <Link
                key={goal._id}
                to={`/goals/${goal._id}`}
                className="group flex flex-col gap-2 rounded-xl border border-border/40 bg-accent/20 p-3.5 transition-all hover:bg-accent/40 hover:border-purple-200 dark:hover:border-purple-900/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {goal.title}
                  </span>
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 shrink-0">
                    {progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                  <div className="flex items-center gap-1">
                    <Flag className="size-3 text-muted-foreground" />
                    <span>
                      {completedMilestones}/{totalMilestones} milestones
                    </span>
                  </div>

                  {goal.targetDate && (
                    <span>
                      Target: {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </ul>
      )}
    </div>
  );
}
