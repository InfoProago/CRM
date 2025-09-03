// src/components/ui/select.jsx
import React from "react";

export function Select({ value, onValueChange, children }) {
  return (
    <div className="relative">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  );
}

export function SelectTrigger({ children }) {
  return (
    <button className="h-10 px-3 border rounded-md w-full text-left">
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }) {
  return <span className="text-sm text-muted-foreground">{placeholder}</span>;
}

export function SelectContent({ children }) {
  return (
    <div className="mt-1 border rounded-md bg-white shadow-md">{children}</div>
  );
}

export function SelectItem({ value, children, onValueChange }) {
  return (
    <div
      onClick={() => onValueChange && onValueChange(value)}
      className="px-3 py-2 hover:bg-zinc-100 cursor-pointer"
    >
      {children}
    </div>
  );
}
