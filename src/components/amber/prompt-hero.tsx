import { cn } from "@/lib/utils";

export function PromptHero({
  prompt,
  onTap,
  answered,
  className,
}: {
  prompt: string;
  onTap?: () => void;
  answered?: boolean;
  className?: string;
}) {
  const interactive = !answered && onTap;
  return (
    <div className={cn("mt-4", className)}>
      <button
        type="button"
        onClick={interactive ? onTap : undefined}
        disabled={!interactive}
        className={cn(
          "block w-full text-left transition-opacity",
          interactive && "cursor-pointer hover:opacity-80 active:opacity-70",
          !interactive && "cursor-default",
        )}
      >
        <p className="text-prompt text-foreground text-balance">{prompt}</p>
        {interactive && (
          <p className="mt-3 text-sm font-medium text-hearth">Tap to answer</p>
        )}
        {answered && (
          <p className="mt-3 text-caption">You shared today</p>
        )}
      </button>
    </div>
  );
}
