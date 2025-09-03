// src/components/ui/tabs.jsx
import React from "react";

export function Tabs({ value, onValueChange, children }) {
  return (
    <div>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  );
}

export function TabsList({ children, className }) {
  return (
    <div className={`inline-flex border rounded-md ${className || ""}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value: triggerValue, value, onValueChange, children }) {
  return (
    <button
      onClick={() => onValueChange && onValueChange(triggerValue)}
      className={`px-3 py-2 text-sm ${
        triggerValue === value ? "bg-zinc-200 font-medium" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value: contentValue, value, children }) {
  if (contentValue !== value) return null;
  return <div className="mt-3">{children}</div>;
}
