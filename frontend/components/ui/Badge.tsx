"use client";
import React from "react";

export type BadgeVariant =
  | "libertadores_group"
  | "libertadores_qualifier"
  | "sudamericana"
  | "descenso_directo"
  | "promocion"
  | null;

export const Badge: React.FC<{ variant: BadgeVariant; label?: string; size?: "xs" | "sm" }> = ({ variant, label, size = "sm" }) => {
  const base = "font-semibold px-2 py-0.5 rounded-full text-white shadow-md whitespace-nowrap";
  const textSize = size === "xs" ? "text-[10px]" : "text-[11px]";

  let bg = "bg-gray-600";
  let content = label || "";

  switch (variant) {
    case "libertadores_group":
      bg = "bg-amber-600";
      content = content || "Libertadores (Grupos)";
      break;
    case "libertadores_qualifier":
      bg = "bg-orange-600";
      content = content || "Libertadores (Pre)";
      break;
    case "sudamericana":
      bg = "bg-sky-400 text-white";
      content = content || "Sudamericana";
      break;
    case "descenso_directo":
      bg = "bg-red-700";
      content = content || "Descenso Directo";
      break;
    case "promocion":
      bg = "bg-orange-600";
      content = content || "Promoción";
      break;
    default:
      break;
  }

  return <span className={`${textSize} ${base} ${bg}`}>{content}</span>;
};

export default Badge;
