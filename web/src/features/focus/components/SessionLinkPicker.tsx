import { useState, useEffect } from "react";
import { GraduationCap, Flag, CheckSquare, X, Search, Check } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import type { FocusLinkedType } from "@lifeos/shared";

export interface LinkedItemOption {
  id: string;
  type: FocusLinkedType;
  title: string;
  subtitle?: string;
  color?: string;
}

interface SessionLinkPickerProps {
  selectedType: FocusLinkedType;
  selectedId: string | null;
  onSelect: (type: FocusLinkedType, id: string | null, title?: string) => void;
  onClose?: () => void;
  initialItems?: LinkedItemOption[];
}

export function SessionLinkPicker({
  selectedType,
  selectedId,
  onSelect,
  onClose,
  initialItems
}: SessionLinkPickerProps) {
  const [activeTab, setActiveTab] = useState<FocusLinkedType>(
    selectedType === "none" ? "topic" : selectedType
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<LinkedItemOption[]>(initialItems || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems.filter((i) => (activeTab === "none" ? true : i.type === activeTab)));
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        if (activeTab === "topic") {
          const res = await apiClient.get("/study/topics");
          const topics = res.data?.topics || [];
          setItems(
            topics.map((t: any) => ({
              id: t.id,
              type: "topic",
              title: t.title,
              subtitle: `Priority: ${t.priority} • Status: ${t.status.replace("_", " ")}`,
              color: "#0075de"
            }))
          );
        } else if (activeTab === "goal") {
          const res = await apiClient.get("/goals");
          const goals = res.data?.goals || [];
          setItems(
            goals.map((g: any) => ({
              id: g.id,
              type: "goal",
              title: g.title,
              subtitle: `Progress: ${g.progressPercent || 0}%`,
              color: "#2a9d99"
            }))
          );
        } else if (activeTab === "task") {
          const res = await apiClient.get("/habits");
          const habits = res.data?.habits || [];
          setItems(
            habits.map((h: any) => ({
              id: h.id,
              type: "task",
              title: h.title,
              subtitle: `Habit Task • Target: ${h.targetCount || 1}/day`,
              color: "#dd5b00"
            }))
          );
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    if (activeTab !== "none") {
      loadData();
    }
  }, [activeTab, initialItems]);

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-sm p-4 w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e6e6e6]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#000000]">Link Session To</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4]"
            aria-label="Close picker"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Type Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f6f5f4] rounded-lg mt-3">
        <button
          type="button"
          onClick={() => setActiveTab("topic")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "topic"
              ? "bg-white text-[#0075de] font-semibold shadow-xs"
              : "text-[#615d59] hover:text-[#000000]"
          }`}
        >
          <GraduationCap className="size-3.5" />
          <span>Topic</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("goal")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "goal"
              ? "bg-white text-[#2a9d99] font-semibold shadow-xs"
              : "text-[#615d59] hover:text-[#000000]"
          }`}
        >
          <Flag className="size-3.5" />
          <span>Goal</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("task")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "task"
              ? "bg-white text-[#dd5b00] font-semibold shadow-xs"
              : "text-[#615d59] hover:text-[#000000]"
          }`}
        >
          <CheckSquare className="size-3.5" />
          <span>Habit / Task</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mt-3">
        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeTab === "topic" ? "study topics" : activeTab === "goal" ? "goals" : "habits"}...`}
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#e6e6e6] rounded-md text-xs text-[#000000] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de]"
        />
      </div>

      {/* Item List */}
      <div className="mt-3 max-h-52 overflow-y-auto divide-y divide-[#f6f5f4] border border-[#e6e6e6] rounded-lg">
        {/* Unlink Option */}
        <button
          type="button"
          onClick={() => {
            onSelect("none", null);
            if (onClose) onClose();
          }}
          className={`w-full text-left p-2.5 flex items-center justify-between hover:bg-[#f6f5f4] transition-colors ${
            selectedType === "none" || !selectedId ? "bg-[#f6f5f4]/80 font-medium" : ""
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs text-[#615d59] font-medium">None (Standalone focus session)</p>
          </div>
          {(selectedType === "none" || !selectedId) && (
            <Check className="size-3.5 text-[#0075de] shrink-0" />
          )}
        </button>

        {loading ? (
          <div className="p-4 text-center text-xs text-[#a39e98]">Loading items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#a39e98]">
            No {activeTab}s found matching "{searchQuery}"
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedType === item.type && selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.type, item.id, item.title);
                  if (onClose) onClose();
                }}
                className={`w-full text-left p-2.5 flex items-center justify-between hover:bg-[#f6f5f4] transition-colors ${
                  isSelected ? "bg-[#0075de]/5 font-medium" : ""
                }`}
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs text-[#000000] font-medium truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[11px] text-[#615d59] mt-0.5 truncate">{item.subtitle}</p>
                  )}
                </div>
                {isSelected && <Check className="size-3.5 text-[#0075de] shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
