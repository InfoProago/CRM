// src/components/ui/dialog.jsx
// Flexible dialog component with size presets, fullscreen, alignment, and scrollable content.
// Backward compatible with previous API. Your className always wins.

import React, { useEffect, useMemo, useRef } from "react";

// tiny cx helper
function cx(...args) {
  return args
    .flatMap((a) => (Array.isArray(a) ? a : [a]))
    .filter(Boolean)
    .join(" ");
}

const DialogContext = React.createContext({ open: false, onOpenChange: () => {} });

export function Dialog({ open, onOpenChange = () => {}, children }) {
  // lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  if (!open) return null;
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

const SIZE_MAP = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

export function DialogContent({
  className = "",
  children,
  size = "md",          // "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  fullScreen = false,   // true => take entire viewport
  align = "center",     // "center" | "top"
  scroll = false,       // true => internal scroll area with sensible max height
  closeOnBackdrop = true,
  role = "dialog",
  ariaLabelledBy,       // optional id for Title for a11y
}) {
  const { onOpenChange } = React.useContext(DialogContext);
  const panelRef = useRef(null);

  // ESC to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  // backdrop click to close (ignore clicks inside panel)
  const onBackdropMouseDown = (e) => {
    if (!closeOnBackdrop) return;
    if (panelRef.current && !panelRef.current.contains(e.target)) onOpenChange(false);
  };

  // container alignment
  const containerAlign =
    align === "top"
      ? "items-start pt-8 sm:pt-12"
      : "items-center";

  // panel sizing
  const baseSize = fullScreen ? "w-screen h-screen max-w-none" : `w-auto ${SIZE_MAP[size] || SIZE_MAP.md}`;
  const basePad = fullScreen ? "p-4 sm:p-6" : "p-4 sm:p-6";

  // scroll handling
  // - when full screen: let content fill, but make inner wrapper scrollable
  // - when not full screen & scroll=true: cap height at ~85vh and scroll inside
  const scrollWrap = fullScreen
    ? "h-full overflow-auto"
    : scroll
    ? "max-h-[85vh] overflow-auto"
    : "";

  return (
    <div
      className={cx("fixed inset-0 z-[1000] flex justify-center", containerAlign)}
      onMouseDown={onBackdropMouseDown}
      aria-modal="true"
      role={role}
      aria-labelledby={ariaLabelledBy}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={panelRef}
        className={cx(
          "relative z-[1001] bg-white rounded-2xl shadow-xl",
          baseSize,
          basePad,
          scrollWrap,
          "mx-4", // margin from edges on small screens
          className // YOUR overrides come last
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Simple structure helpers
export function DialogHeader({ className = "", children }) {
  return <div className={cx("mb-3", className)}>{children}</div>;
}

export function DialogTitle({ className = "", id, children }) {
  return <h3 id={id} className={cx("text-lg font-semibold text-center", className)}>{children}</h3>;
}

export function DialogFooter({ className = "", children }) {
  return <div className={cx("mt-4 flex items-center justify-end gap-2", className)}>{children}</div>;
}
