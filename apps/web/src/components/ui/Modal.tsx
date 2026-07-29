import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-[12px] p-7 z-10 shadow-editorial-md">
        <div className="flex items-start justify-between mb-5">
          <div>
            {title && (
              <h2 className="font-serif text-xl font-normal text-ink tracking-tight leading-snug">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>
            )}
          </div>

          {/* Close: simple × character */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="ml-4 shrink-0 w-7 h-7 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-bone transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body,
  );
};
