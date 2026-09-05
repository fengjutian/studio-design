import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, Check } from "@/components/icons";
import { cn } from "@/lib/utils";

interface StatusProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "success" | "warning" | "error" | "neutral";
  children: ReactNode;
}

export function Status({ tone = "neutral", className, children, ...props }: StatusProps) {
  return <div className={cn("ui-status", `ui-status-${tone}`, className)} {...props}>{tone === "success" ? <Check size={14} /> : tone === "error" || tone === "warning" ? <AlertCircle size={14} /> : null}{children}</div>;
}
