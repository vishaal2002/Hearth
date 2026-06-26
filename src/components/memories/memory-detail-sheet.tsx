import { MapPin } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Overline } from "@/components/hearth";
import { UserAvatar, type ProfileLike } from "@/components/calendar/user-avatar";
import { moodMeta } from "@/lib/prompts";
import type { Moment } from "./memory-card";

export function MemoryDetailSheet({
  moment,
  who,
  onClose,
}: {
  moment: Moment | null;
  who?: ProfileLike;
  onClose: () => void;
}) {
  const mood = moment ? moodMeta(moment.mood) : null;
  const dateLabel = moment
    ? new Date(moment.happened_on + "T00:00:00").toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Sheet open={!!moment} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {moment && (
          <div className="flex h-full flex-col overflow-y-auto">
            {moment.photo_url && (
              <img
                src={moment.photo_url}
                alt=""
                className="aspect-[4/3] w-full bg-muted object-cover"
              />
            )}
            <div className="space-y-4 p-6">
              <div>
                <Overline>{dateLabel}</Overline>
                {moment.prompt_text && (
                  <p className="mt-2 text-caption italic leading-snug">{moment.prompt_text}</p>
                )}
              </div>

              {moment.body && (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                  {moment.body}
                </p>
              )}

              {moment.location && (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-hearth" />
                  {moment.location}
                </p>
              )}

              <div className="flex items-center gap-2 border-t border-border pt-4">
                {who && <UserAvatar profile={who} size="sm" />}
                <span className="text-sm text-foreground">
                  {who?.full_name?.split(" ")[0] ?? "Someone"}
                </span>
                {mood && (
                  <span className="ml-auto text-lg" title={mood.label}>
                    {mood.emoji}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
