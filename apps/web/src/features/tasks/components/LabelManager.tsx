import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore.js';
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from '../hooks/useLabels.js';
import { X, Plus, Trash2, Check } from 'lucide-react';

const presetColors = [
  '#FDEBEC', // Pale Red
  '#E1F3FE', // Pale Blue
  '#EDF3EC', // Pale Green
  '#FBF3DB', // Pale Yellow
  '#F7F6F3', // Pale Bone/Gray
];

export const LabelManager: React.FC = () => {
  const { isLabelManagerOpen, setLabelManagerOpen } = useTaskStore();
  const { data: labels = [], isLoading } = useLabels();
  
  const createMutation = useCreateLabel();
  const deleteMutation = useDeleteLabel();
  
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(presetColors[0]);

  if (!isLabelManagerOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        color: selectedColor,
      });
      setName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this label? Linked tasks will lose this label.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-[2px] font-sans">
      <div className="bg-surface border border-border w-full max-w-md rounded-lg shadow-editorial-md overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-editorial text-xl text-ink">Manage Labels</h4>
          <button
            onClick={() => setLabelManagerOpen(false)}
            className="text-muted hover:text-charcoal transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* Create form */}
          <form onSubmit={handleCreate} className="space-y-3 p-3 bg-bone border border-border rounded-md">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New label name..."
                maxLength={50}
                className="flex-1 text-xs border border-border focus:border-charcoal focus:ring-0 outline-none rounded p-1.5 bg-surface text-charcoal font-medium"
              />
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-3 py-1.5 bg-ink text-surface text-xs rounded border border-ink hover:bg-charcoal active:scale-95 transition-all font-medium flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Create
              </button>
            </div>

            {/* Presets color selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Label Color</span>
              <div className="flex space-x-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  >
                    {selectedColor === color && <Check className="w-3 h-3 text-charcoal" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* List existing */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-bold">Existing Labels</span>
            {isLoading ? (
              <div className="text-xs text-muted">Loading labels...</div>
            ) : labels.length === 0 ? (
              <div className="text-xs text-muted italic">No labels created yet.</div>
            ) : (
              <div className="space-y-1.5">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-2 border border-border hover:bg-bone/40 rounded transition-all"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full border border-border/40"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-xs font-medium text-charcoal">{label.name}</span>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="p-1 text-muted hover:text-accent-red-text hover:bg-accent-red-bg/30 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default LabelManager;
