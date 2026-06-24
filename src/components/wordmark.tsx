import { cn } from "@/lib/utils";

/**
 * Hearth wordmark — editorial serif + hearth accent dot.
 */
export function Wordmark({
  size = "md",
  withName = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withName?: boolean;
  className?: string;
}) {
  const dot = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" }[size];
  const text = { sm: "text-[15px]", md: "text-lg", lg: "text-xl" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn("shrink-0 rounded-full bg-hearth", dot)}
        aria-hidden
      />
      {withName && (
        <span className={cn("font-semibold tracking-tight text-foreground", text)}>Hearth</span>
      )}
    </span>
  );
}
