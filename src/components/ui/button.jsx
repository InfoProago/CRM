// src/components/ui/button.jsx
import React from "react";

const cx = (...c) => c.filter(Boolean).join(" ");

export function Button({ variant = "default", size = "md", className = "", children, ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-900",
    outline: "border border-zinc-300 hover:bg-zinc-50",
    ghost: "hover:bg-zinc-100",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    secondary: "bg-zinc-100 hover:bg-zinc-200",
  };
  const sizes = {
    xs: "h-8 px-2 text-xs",
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4",
    icon: "h-9 w-9",
  };
  return (
    <button
      className={cx(
        base,
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
