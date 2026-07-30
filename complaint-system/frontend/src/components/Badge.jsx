import React from "react";

const COLOR_MAP = {
  // status
  open: "bg-blue-100 text-blue-700",
  under_investigation: "bg-amber-100 text-amber-700",
  pending_capa: "bg-purple-100 text-purple-700",
  closed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-slate-200 text-slate-600",
  // severity
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function Badge({ value }) {
  const classes = COLOR_MAP[value] || "bg-slate-100 text-slate-600";
  const label = value ? value.replaceAll("_", " ") : "-";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${classes}`}>
      {label}
    </span>
  );
}
