import { useMemo, useRef, useState } from "react";
import { Tag, X, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add tags…"
}: TagInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    const existing = new Set(value.map((v) => v.toLowerCase()));
    return suggestions
      .filter((s) => !existing.has(s.toLowerCase()))
      .filter((s) => (trimmedQuery ? s.toLowerCase().includes(trimmedQuery) : true));
  }, [suggestions, value, trimmedQuery]);

  const canCreateNew = trimmedQuery.length > 0 && !value.some((v) => v.toLowerCase() === trimmedQuery);

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,$/, "");
    if (!tag) return;
    if (!value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const highlighted = matches[activeIndex];
      if (activeIndex >= 0 && highlighted) {
        addTag(highlighted);
      } else {
        addTag(query);
      }
      return;
    }
    if (e.key === "Backspace" && !query && value.length > 0) {
      e.preventDefault();
      const removed = value[value.length - 1];
      removeTag(removed);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (matches.length === 0 ? -1 : (i + 1) % matches.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (matches.length === 0 ? -1 : (i - 1 + matches.length) % matches.length));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showMenu = open && (matches.length > 0 || canCreateNew);

  return (
    <div className="relative flex flex-col gap-1.5">
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5 rounded-md border border-[#e6e6e6] bg-white px-2 py-1.5 transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#0075de]">
        <Tag className="size-4 shrink-0 text-[#a39e98]" aria-hidden="true" />
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#f6f5f4] px-2 py-0.5 text-xs font-medium text-[#31302e]"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => removeTag(tag)}
              className="text-[#a39e98] transition-colors hover:text-[#000000]"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={showMenu ? "tag-suggestions" : undefined}
          aria-activedescendant={activeIndex >= 0 ? `tag-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm text-[#000000] placeholder:text-[#a39e98] focus:outline-none"
        />
      </div>

      {showMenu && (
        <ul
          id="tag-suggestions"
          role="listbox"
          className="absolute top-full z-20 mt-1.5 flex max-h-56 w-full flex-col overflow-y-auto rounded-lg border border-[#e6e6e6] bg-white py-1 shadow-lg"
        >
          {matches.map((tag, index) => (
            <li key={tag} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#31302e]",
                  index === activeIndex && "bg-[#f6f5f4]"
                )}
              >
                <Tag className="size-3.5 text-[#a39e98]" aria-hidden="true" />
                <span className="truncate">{tag}</span>
              </button>
            </li>
          ))}

          {canCreateNew && (
            <li role="option" aria-selected={activeIndex === matches.length}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(query);
                }}
                onMouseEnter={() => setActiveIndex(matches.length)}
                className={cn(
                  "flex w-full items-center gap-2 border-t border-[#e6e6e6] px-3 py-1.5 text-left text-sm text-[#0075de]",
                  activeIndex === matches.length && "bg-[#f6f5f4]"
                )}
              >
                <Check className="size-3.5" aria-hidden="true" />
                Create “{query.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}