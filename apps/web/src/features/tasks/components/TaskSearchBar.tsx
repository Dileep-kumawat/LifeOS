import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface TaskSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const TaskSearchBar: React.FC<TaskSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search tasks...',
}) => {
  const [localVal, setLocalVal] = useState(value);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(localVal);
    }, 300);

    return () => clearTimeout(handler);
  }, [localVal, onChange]);

  // Sync state if external changes occur
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <div className="relative w-full max-w-md font-sans">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
        <Search className="w-4 h-4" strokeWidth={2.2} />
      </div>
      <input
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 border border-border focus:border-charcoal focus:ring-0 outline-none rounded text-xs bg-surface text-charcoal transition-all placeholder:text-muted/60 font-medium"
      />
      {localVal && (
        <button
          onClick={() => setLocalVal('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-charcoal transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
export default TaskSearchBar;
