// src/components/ui/dialog.jsx
import React from "react";

/**
 * Overlay + portal container. No sizing here.
 * Sizing/styling is applied by <DialogContent>.
 */
export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={() => onOpenChange && onOpenChange(false)}
    >
      {/* Center the content */}
      <div className="fixed inset-0 flex items-center justify-center">
        {/* Stop overlay clicks from closing when interacting with the panel */}
        <div onClick={(e) => e.stopPropagation()} className="contents">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The panel. Accepts className/style so pages can override width/height.
 * Default = big (95vw up to 1600px wide, 90vh tall) as requested.
 */
export function DialogContent({ children, className = "", style }) {
  const base =
    "bg-white rounded-xl shadow-xl " +
    "w-[95vw] max-w-[95vw] sm:max-w-[1600px] " +
    "h-[90vh] p-4 overflow-hidden";
  return (
    <div className={`${base} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = "" }) {
  return <div className={`mb-2 ${className}`}>{children}</div>;
}

export function DialogTitle({ children, className = "" }) {
  return <h3 className={`font-semibold text-lg mb-1 ${className}`}>{children}</h3>;
}

export function DialogDescription({ children, className = "" }) {
  return <p className={`text-sm text-muted-foreground mb-2 ${className}`}>{children}</p>;
}

export function DialogFooter({ children, className = "" }) {
  return <div className={`mt-4 flex justify-end gap-2 ${className}`}>{children}</div>;
}
