import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Minimal, dependency-free Popover used for the notification panel. Hand-rolled
 * to match this project's non-Radix shadcn-style primitives.
 *
 * Keyboard support: Escape closes; the trigger toggles with Enter/Space (native
 * button behavior); content is focusable and participates in tab order. Outside
 * pointer-down closes the popover.
 */

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext(): PopoverContextValue {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover sub-components must be used inside <Popover>");
  return ctx;
}

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange
}: PopoverProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const wasOpenRef = React.useRef(false);

  const open = openProp ?? uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openProp]
  );

  // Focus management: move focus into the dialog on open, return it to the
  // trigger button on close — keeps the bell + panel keyboard-navigable.
  React.useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        triggerRef.current?.querySelector("button")?.focus();
      }
      wasOpenRef.current = false;
      return;
    }
    wasOpenRef.current = true;
    const frame = window.setTimeout(() => contentRef.current?.focus(), 0);
    return () => window.clearTimeout(frame);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: Event) {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideContent = contentRef.current?.contains(target);
      if (insideTrigger || insideContent) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, setOpen]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PopoverTrigger({ asChild, className, children }: PopoverTriggerProps) {
  const ctx = usePopoverContext();

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    ctx.setOpen(!ctx.open);
  };

  const triggerProps = {
    "aria-haspopup": "dialog" as const,
    "aria-expanded": ctx.open,
    onClick: handleClick
  };

  let trigger: React.ReactNode;
  if (asChild && React.isValidElement(children)) {
    trigger = React.cloneElement(
      children as React.ReactElement<{ onClick?: unknown; className?: string }>,
      {
        ...triggerProps,
        onClick: (event: React.MouseEvent) => {
          (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(event);
          if (!event.defaultPrevented) handleClick(event);
        }
      }
    );
  } else {
    trigger = (
      <button type="button" className={className} {...triggerProps}>
        {children}
      </button>
    );
  }

  return (
    <div ref={ctx.triggerRef} className="relative inline-flex">
      {trigger}
    </div>
  );
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

export function PopoverContent({
  className,
  align = "end",
  children,
  style,
  ...props
}: PopoverContentProps) {
  const ctx = usePopoverContext();
  const [shiftX, setShiftX] = React.useState(0);
  const shiftXRef = React.useRef(0);
  shiftXRef.current = shiftX;

  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

  useIsomorphicLayoutEffect(() => {
    if (!ctx.open) {
      setShiftX(0);
      return;
    }

    const updatePosition = () => {
      const el = ctx.contentRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const currentShift = shiftXRef.current;
      // Reconstruct natural unshifted bounding coordinates
      const naturalLeft = rect.left - currentShift;
      const naturalRight = rect.right - currentShift;
      const padding = 12; // Viewport edge safety margin
      const viewportWidth = window.innerWidth;

      let newShift = 0;
      if (naturalLeft < padding) {
        newShift = padding - naturalLeft;
      } else if (naturalRight > viewportWidth - padding) {
        newShift = viewportWidth - padding - naturalRight;
      }

      if (Math.abs(currentShift - newShift) > 0.5) {
        setShiftX(newShift);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [ctx.open, ctx.contentRef]);

  if (!ctx.open) return null;

  const alignClass =
    align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";

  const transform =
    align === "center"
      ? `translateX(calc(-50% + ${shiftX}px))`
      : shiftX
        ? `translateX(${shiftX}px)`
        : undefined;

  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(transform
      ? {
          transform: style?.transform ? `${style.transform} ${transform}` : transform
        }
      : {})
  };

  return (
    <div
      ref={ctx.contentRef}
      role="dialog"
      tabIndex={-1}
      style={combinedStyle}
      className={cn(
        "absolute top-full mt-2 z-50 w-[calc(100vw-1.5rem)] sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#e6e6e6] bg-white text-[#31302e] shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]",
        alignClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
