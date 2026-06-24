import { MOODS } from "@/lib/prompts";
import { cn } from "@/lib/utils";
import { Whisper } from "./typography";

/** Feelings arranged on a soft arc — not a chip row. */
export function MoodOrbit({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="relative pt-2 pb-4">
      <Whisper className="mb-4 text-center">how does it feel?</Whisper>
      <div className="flex flex-wrap justify-center gap-2">
        {MOODS.map((m) => {
          const selected = value === m.key;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : m.key)}
              className={cn(
                "flex h-14 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 transition-all active:scale-95",
                selected
                  ? "bg-primary/12 text-foreground ring-1 ring-primary/35"
                  : "bg-secondary/80 text-muted-foreground hover:bg-secondary",
              )}
            >
              <span className="text-lg leading-none" aria-hidden>{m.emoji}</span>
              <span className="text-[10px] font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
