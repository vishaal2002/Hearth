import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Paper({
  children,
  className,
  tilt,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  tilt?: number;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "surface-paper text-left",
        onClick && "cursor-pointer transition-transform active:scale-[0.99]",
        className,
      )}
      style={tilt !== undefined ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {children}
    </Comp>
  );
}

export function GlowPool({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none absolute inset-0 -z-10 animate-glow-breathe glow-ember"
        aria-hidden
      />
      {children}
    </div>
  );
}
