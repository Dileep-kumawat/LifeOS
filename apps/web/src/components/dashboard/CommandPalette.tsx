import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useThemeStore } from '../../store/useThemeStore';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Preferences';
  title: string;
  subtitle?: string;
  shortcut?: string[];
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const isOpen = useDashboardStore((state) => state.commandPaletteOpen);
  const setOpen = useDashboardStore((state) => state.setCommandPaletteOpen);
  const openQuickCapture = useDashboardStore((state) => state.openQuickCapture);
  
  // Dynamic lookup for theme store toggle
  const themeStore = useThemeStore();
  const toggleTheme = themeStore.toggleTheme || (() => {});

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define commands list
  const commands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Main command center overview',
      shortcut: ['G', 'D'],
      action: () => { navigate('/dashboard'); setOpen(false); },
    },
    {
      id: 'nav-tasks',
      category: 'Navigation',
      title: 'Go to Tasks',
      subtitle: 'Manage your active workload',
      shortcut: ['G', 'T'],
      action: () => { navigate('/dashboard/tasks'); setOpen(false); },
    },
    {
      id: 'nav-projects',
      category: 'Navigation',
      title: 'Go to Projects',
      subtitle: 'Browse project canvases',
      shortcut: ['G', 'P'],
      action: () => { navigate('/dashboard/projects'); setOpen(false); },
    },
    {
      id: 'nav-notes',
      category: 'Navigation',
      title: 'Go to Notes',
      subtitle: 'Open recent notebooks and files',
      shortcut: ['G', 'N'],
      action: () => { navigate('/dashboard/notes'); setOpen(false); },
    },
    {
      id: 'create-task',
      category: 'Actions',
      title: 'Create New Task',
      subtitle: 'Add a todo to task inbox',
      shortcut: ['N', 'T'],
      action: () => { setOpen(false); openQuickCapture('task'); },
    },
    {
      id: 'create-note',
      category: 'Actions',
      title: 'Create New Note',
      subtitle: 'Quickly capture draft notebook',
      shortcut: ['N', 'N'],
      action: () => { setOpen(false); openQuickCapture('note'); },
    },
    {
      id: 'toggle-theme',
      category: 'Preferences',
      title: 'Toggle Light / Dark Mode',
      subtitle: 'Switch application color theme',
      shortcut: ['T', 'T'],
      action: () => { toggleTheme(); setOpen(false); },
    },
    {
      id: 'nav-settings',
      category: 'Preferences',
      title: 'Go to Settings',
      subtitle: 'Configure accounts and themes',
      shortcut: ['G', ','],
      action: () => { navigate('/dashboard/settings'); setOpen(false); },
    },
  ];

  // Filter commands by search term
  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase()) ||
    (cmd.subtitle && cmd.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // Keyboard listener for Cmd+K / Ctrl+K and Navigation
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Toggle palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }

      if (!isOpen) return;

      // Handle arrow navigation and enter keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isOpen, selectedIndex, filteredCommands, setOpen]);

  // Auto-scroll selected command into view
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedEl && listRef.current) {
      const container = listRef.current;
      const elTop = selectedEl.offsetTop;
      const elHeight = selectedEl.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (elTop < containerScrollTop) {
        container.scrollTop = elTop;
      } else if (elTop + elHeight > containerScrollTop + containerHeight) {
        container.scrollTop = elTop + elHeight - containerHeight;
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group commands by category for display
  const categories = Array.from(new Set(filteredCommands.map((c) => c.category)));

  let globalItemIndex = 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/15 backdrop-blur-[2px] transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-[10px] shadow-editorial-lg overflow-hidden flex flex-col z-10 max-h-[420px]">
        {/* Search Input */}
        <div className="relative border-b border-border px-4 py-3.5 flex items-center gap-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search workspace…"
            className="w-full text-xs font-sans text-ink placeholder-muted bg-transparent outline-none border-none"
          />
          <kbd className="text-[9px] font-mono bg-bone border border-border px-1.5 py-0.5 rounded text-muted select-none">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2.5 max-h-[350px]">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-muted">
              No command matches found for "{search}"
            </div>
          ) : (
            categories.map((cat) => {
              const catCmds = filteredCommands.filter((c) => c.category === cat);
              return (
                <div key={cat}>
                  <div className="text-[9px] font-mono font-bold tracking-widest text-muted uppercase px-4 py-1">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {catCmds.map((cmd) => {
                      const currentIndex = globalItemIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <div
                          key={cmd.id}
                          onClick={() => cmd.action()}
                          className={[
                            'px-4 py-2 flex items-center justify-between cursor-pointer transition-colors duration-150',
                            isSelected
                              ? 'bg-bone text-ink shadow-[inset_3px_0_0_0_#111111]'
                              : 'text-charcoal hover:bg-bone/40',
                          ].join(' ')}
                        >
                          <div className="min-w-0 pr-3">
                            <p className="text-xs font-medium">{cmd.title}</p>
                            {cmd.subtitle && (
                              <p className="text-[10px] text-muted truncate mt-0.5">{cmd.subtitle}</p>
                            )}
                          </div>

                          {/* Shortcuts */}
                          {cmd.shortcut && (
                            <div className="flex gap-0.5 shrink-0">
                              {cmd.shortcut.map((sc, scIdx) => (
                                <kbd
                                  key={scIdx}
                                  className="text-[9px] font-mono bg-surface border border-border px-1.5 py-0.5 rounded text-muted"
                                >
                                  {sc}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Guidance */}
        <div className="border-t border-border bg-bone px-4 py-2 flex items-center justify-between text-[8px] font-mono text-muted select-none">
          <div className="flex gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Enter to select</span>
          </div>
          <span>ctrl + k to toggle</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
