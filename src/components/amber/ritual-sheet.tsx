import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { EmberButton } from "./ember-button";
import { MoodOrbit } from "./mood-orbit";
import { Whisper } from "./typography";

export function RitualSheet({
  open,
  onOpenChange,
  prompt,
  mood,
  onMoodChange,
  body,
  onBodyChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  mood: string | null;
  onMoodChange: (v: string | null) => void;
  body: string;
  onBodyChange: (v: string) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] rounded-t-[28px] border-border/50 bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden />
        <DrawerHeader className="px-0 pt-4 text-left">
          <DrawerTitle className="sr-only">Answer today&apos;s question</DrawerTitle>
          <DrawerDescription asChild>
            <div>
              <Whisper className="mb-2">your answer</Whisper>
              <p className="text-moment text-foreground/90 line-clamp-2">{prompt}</p>
            </div>
          </DrawerDescription>
        </DrawerHeader>

        <MoodOrbit value={mood} onChange={onMoodChange} />

        <Textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="A line, a thought, a small true thing…"
          className="min-h-[7rem] resize-none rounded-2xl border-transparent bg-secondary/50 text-base leading-relaxed focus-visible:ring-primary"
          maxLength={1000}
          autoFocus
        />

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Only they can see this — once you share, you&apos;ll see theirs.
        </p>

        <div className="mt-5 flex justify-center">
          <EmberButton size="lg" loading={saving} onClick={onSave} className="w-full max-w-xs">
            Keep it
          </EmberButton>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
