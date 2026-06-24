import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function EmberButton({
  className,
  children,
  loading,
  size = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; size?: "default" | "lg" | "sm" }) {
  const sizes = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-4 text-sm",
    lg: "h-11 px-6 text-base",
  };
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "bg-primary text-primary-foreground shadow-sm",
        "transition-all hover:bg-primary/90 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground",
        "transition-colors hover:bg-accent hover:text-foreground active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
