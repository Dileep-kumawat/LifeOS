import React from "react";
import { Search, Calendar, ChevronLeft, ChevronRight, X, Clock, Brain } from "lucide-react";
import type { FocusSession, FocusLinkedType, FocusSessionStatus } from "@lifeos/shared";

import { SessionHistoryRow } from "./SessionHistoryRow";

interface SessionHistoryListProps {
  sessions: FocusSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading?: boolean;
  // Filter States & Handlers
  selectedLinkedType: FocusLinkedType | "";
  onSelectLinkedType: (type: FocusLinkedType | "") => void;
  selectedStatus: FocusSessionStatus | "";
  onSelectStatus: (status: FocusSessionStatus | "") => void;
  startDate: string;
  onSelectStartDate: (date: string) => void;
  endDate: string;
  onSelectEndDate: (date: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onPageChange: (newPage: number) => void;
  onClearFilters: () => void;
}

export const SessionHistoryList: React.FC<SessionHistoryListProps> = ({
  sessions,
  total,
  page,
  totalPages,
  isLoading,
  selectedLinkedType,
  onSelectLinkedType,
  selectedStatus,
  onSelectStatus,
  startDate,
  onSelectStartDate,
  endDate,
  onSelectEndDate,
  search,
  onSearchChange,
  onPageChange,
  onClearFilters
}) => {
  const hasActiveFilters = Boolean(
    selectedLinkedType || selectedStatus || startDate || endDate || search
  );

  // Compute aggregate stats for current view
  const totalFocusMinutesInView = sessions.reduce(
    (acc, s) => acc + (s.totalFocusMinutes || 0),
    0
  );
  const completedInView = sessions.filter((s) => s.status === "completed").length;
  const abandonedInView = sessions.filter((s) => s.status === "abandoned").length;

  // Filter client-side by search query if applicable
  const filteredSessions = search.trim()
    ? sessions.filter((s) =>
        s.linkedType.toLowerCase().includes(search.toLowerCase()) ||
        s.status.toLowerCase().includes(search.toLowerCase()) ||
        (s.linkedId && s.linkedId.toLowerCase().includes(search.toLowerCase()))
      )
    : sessions;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search & Filter Controls Card (reusing Finance TransactionList convention) */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#e6e6e6] bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 size-4 text-[#a39e98]" />
            <input
              type="text"
              placeholder="Search by type, entity, or status..."
              className="w-full pl-9 pr-8 py-1.5 text-xs text-[#000000] bg-white rounded-lg border border-[#e6e6e6] focus:outline-none focus:ring-1 focus:ring-[#0075de]"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-2 text-[#a39e98] hover:text-[#000000]"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status and Linked Type Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="inline-flex p-1 rounded-lg border border-[#e6e6e6] bg-[#f6f5f4]">
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedStatus === ""
                    ? "bg-white text-[#000000] shadow-2xs"
                    : "text-[#615d59] hover:text-[#000000]"
                }`}
                onClick={() => onSelectStatus("")}
              >
                All
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedStatus === "completed"
                    ? "bg-[#1aae39]/15 text-[#1aae39]"
                    : "text-[#615d59] hover:text-[#000000]"
                }`}
                onClick={() => onSelectStatus("completed")}
              >
                Completed
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedStatus === "abandoned"
                    ? "bg-[#dd5b00]/15 text-[#dd5b00]"
                    : "text-[#615d59] hover:text-[#000000]"
                }`}
                onClick={() => onSelectStatus("abandoned")}
              >
                Stopped Early
              </button>
            </div>

            {/* Linked Type Dropdown Filter */}
            <select
              className="flex h-8.5 rounded-lg border border-[#e6e6e6] bg-white px-3 py-1 text-xs font-semibold text-[#000000] focus:outline-none focus:ring-1 focus:ring-[#0075de]"
              value={selectedLinkedType}
              onChange={(e) => onSelectLinkedType(e.target.value as FocusLinkedType | "")}
            >
              <option value="">All Categories</option>
              <option value="topic">Study Topics</option>
              <option value="goal">Goals</option>
              <option value="task">Tasks</option>
              <option value="none">General / Unlinked</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1 text-xs text-[#615d59] hover:text-[#000000] px-2 py-1 rounded hover:bg-[#f6f5f4] transition-colors"
              >
                <X className="size-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#f6f5f4] text-xs text-[#615d59]">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-[#a39e98]" />
            <span>From:</span>
            <input
              type="date"
              className="px-2 py-1 rounded-md border border-[#e6e6e6] bg-white text-xs text-[#000000] focus:outline-none focus:ring-1 focus:ring-[#0075de]"
              value={startDate}
              onChange={(e) => onSelectStartDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span>To:</span>
            <input
              type="date"
              className="px-2 py-1 rounded-md border border-[#e6e6e6] bg-white text-xs text-[#000000] focus:outline-none focus:ring-1 focus:ring-[#0075de]"
              value={endDate}
              onChange={(e) => onSelectEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Running Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[#e6e6e6] bg-[#f6f5f4] text-xs">
        <div className="flex items-center gap-2 font-semibold text-[#000000]">
          <Clock className="size-4 text-[#0075de]" />
          <span>
            Showing {filteredSessions.length} of {total} focus session{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-[#0075de]">
            Focus Logged: {totalFocusMinutesInView} mins
          </span>
          <span className="text-[#1aae39]">
            {completedInView} completed
          </span>
          {abandonedInView > 0 && (
            <span className="text-[#dd5b00]">
              {abandonedInView} stopped early
            </span>
          )}
        </div>
      </div>

      {/* Session Rows List */}
      {isLoading ? (
        <div className="flex flex-col gap-2.5 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 w-full rounded-xl bg-white animate-pulse border border-[#e6e6e6]"
            />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-[#e6e6e6] bg-white">
          <div className="size-12 rounded-full bg-[#f6f5f4] flex items-center justify-center mb-3">
            <Brain className="size-6 text-[#a39e98]" />
          </div>
          <h3 className="text-sm font-semibold text-[#000000]">No focus sessions match filters</h3>
          <p className="text-xs text-[#615d59] mt-1 max-w-sm">
            {hasActiveFilters
              ? "No session records match your search or date criteria. Try adjusting or clearing filters."
              : "No historical focus sessions logged yet. Start a session to build your productivity record!"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-3.5 px-3 py-1.5 bg-[#f6f5f4] text-xs font-semibold text-[#0075de] hover:bg-[#e6e6e6] rounded-lg border border-[#e6e6e6]"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredSessions.map((session) => (
            <SessionHistoryRow key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-[#615d59] border-t border-[#e6e6e6]">
          <span>
            Page {page} of {totalPages} ({total} total sessions)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e6e6e6] bg-white text-xs font-semibold text-[#000000] disabled:opacity-40 hover:bg-[#f6f5f4] transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e6e6e6] bg-white text-xs font-semibold text-[#000000] disabled:opacity-40 hover:bg-[#f6f5f4] transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
