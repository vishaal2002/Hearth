import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Whisper({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-whisper block", className)}>{children}</span>;
}

export function Script({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-hand text-[1.75rem] leading-none text-primary", className)}>{children}</span>;
}
