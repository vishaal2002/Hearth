import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function Seal({
  partnerName,
  waiting,
  className,
}: {
  partnerName: string;
  waiting?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/50 px-5 py-6 text-center",
        className,
      )}
      aria-live="polite"
    >
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background text-muted-foreground">
        <Lock className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium">
        {waiting ? `${partnerName} left something` : "Sealed until you share"}
      </p>
      <p className="mx-auto mt-1.5 max-w-xs text-caption leading-relaxed">
        {waiting
          ? "Share yours first — then theirs will open."
          : `When you both answer, you'll see what ${partnerName} kept.`}
      </p>
    </div>
  );
}
