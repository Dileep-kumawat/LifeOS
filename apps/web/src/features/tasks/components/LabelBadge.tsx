import React from 'react';
import { ILabel } from '@lifeos/shared';
import { X } from 'lucide-react';

interface LabelBadgeProps {
  label: ILabel;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({ label, onRemove, onClick, className = '' }) => {
  // Compute text color based on hex color for accessibility,
  // or use dark text for pastels. Since we only use desaturated pastel hex values on server,
  // black/charcoal text is perfect and fits the design system well!
  const customStyle = {
    backgroundColor: `${label.color}33`, // 20% opacity of the hex color
    color: label.color,
    borderColor: `${label.color}55`, // 33% opacity
  };

  return (
    <div
      onClick={onClick}
      style={customStyle}
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wide transition-all ${
        onClick ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'
      } ${className}`}
    >
      <span>{label.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-charcoal focus:outline-none transition-colors"
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};
export default LabelBadge;
