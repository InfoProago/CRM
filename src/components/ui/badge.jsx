// src/components/ui/badge.jsx
import React from "react";

export function Badge({ variant = "default", className = "", children }) {
  const variants = {
    default: "bg-zinc-900 text-white",
    secondary: "bg-zinc-100 text-zinc-900 border",
    destructive: "bg-red-600 text-white",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
}
