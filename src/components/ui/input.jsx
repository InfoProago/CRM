// src/components/ui/input.jsx
// Proago CRM — UI/Input (v2025-09-03)
// - Fully controlled input (fixes "1 character" bug)
// - Optional helpers:
//     • numericCommas → only digits and commas allowed
//     • luxPhone      → formats Luxembourg mobile: "+352 691 999 999"

import React from "react";
import { sanitizeNumericInput, formatLuxPhone } from "../../util";

export const Input = React.forwardRef(function Input(
  {
    className = "",
    type = "text",
    value,
    onChange,
    numericCommas = false,
    luxPhone = false,
    ...props
  },
  ref
) {
  const handleChange = (e) => {
    let v = e.target.value ?? "";

    if (numericCommas) v = sanitizeNumericInput(v);
    if (luxPhone) v = formatLuxPhone(v);

    if (onChange) {
      onChange({
        ...e,
        target: { ...e.target, value: v },
      });
    }
  };

  // keep controlled to avoid cursor/1-char issues
  const safeValue = value ?? "";

  return (
    <input
      ref={ref}
      type={type}
      value={safeValue}
      onChange={handleChange}
      className={
        "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-900 " +
        className
      }
      {...props}
    />
  );
});

export default Input;
