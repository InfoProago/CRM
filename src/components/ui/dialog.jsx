// src/components/ui/dialog.jsx — Proago CRM
// v2025-09-04 • adds size="fill" (90vw x 90vh) but keeps sm|md|lg|xl for Inflow

import React from "react";
import clsx from "clsx";

/**
 * Minimal dialog primitives used across the app.
 * All dialogs share the same base, with flexible sizing.
 */

export function Dialog({ open, onOpenChange, children }) {
  return (
    <div
      role="dialog-root"
      aria-hidden={!open}
      className={clsx(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className={clsx(
          "absolute inset-0 transition-opacity",
          open ? "bg-black/40 opacity-100" : "bg-black/0 opacity-0"
        )}
        onClick={() => onOpenChange?.(false)}
      />
      {/* Content portal */}
      <div
        className={clsx(
          "absolute inset-0 flex items-center justify-center p-4",
          open ? "opacity-100" : "opacity-0"
        )}
      >
        {open ? children : null}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className = "" }) {
  return <div className={clsx("mb-3", className)}>{children}</div>;
}

export function DialogFooter({ children, className = "" }) {
  return (
    <div
      className={clsx("mt-4 flex items-center justify-center gap-2", className)}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "" }) {
  return (
    <h3 className={clsx("text-lg font-semibold", className)}>{children}</h3>
  );
}

/**
 * DialogContent
 * Props:
 * - size: "sm" | "md" | "lg" | "xl" | "fill"  (default "md")
 *   sm  ~ 360px; md ~ 520px; lg ~ 720px; xl ~ 960px
 *   fill = 90vw × 90vh (nearly full screen)
 * - className: appended last so !utilities can override
 */
export function DialogContent({
  size = "md",
  className = "",
  children,
  onClick,
  ...rest
}) {
  const sizeClasses = {
    sm: "max-w-[360px] w-full",
    md: "max-w-[520px] w-full",
    lg: "max-w-[720px] w-full",
    xl: "max-w-[960px] w-full",
    fill: "!max-w-none !w-[90vw] !h-[90vh]",
  };

  const outer = clsx(
    "relative bg-white rounded-xl shadow-xl border p-4 transition-transform outline-none",
    sizeClasses[size] || sizeClasses.md,
    className
  );

  return (
    <div
      role="dialog-panel"
      className={outer}
      onClick={(e) => {
        e.stopPropagation?.();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
