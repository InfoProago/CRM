// src/components/ui/input.jsx
import React from "react";

export const Input = React.forwardRef(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-900 ${className}`}
      {...props}
    />
  );
});
