import { motion, useReducedMotion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Panel } from "@/components/hearth";
import { UserAvatar, type ProfileLike } from "@/components/calendar/user-avatar";
import { moodMeta } from "@/lib/prompts";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export type Moment = Database["public"]["Tables"]["moments"]["Row"];

export function MemoryCard({
  m,
  who,
  showYear,
  onSelect,
}: {
  m: Moment;
  who?: ProfileLike;
  showYear?: boolean;
  onSelect?: (m: Moment) => void;
}) {
  const reduced = useReducedMotion();
  const mood = moodMeta(m.mood);
  const year = m.happened_on.slice(0, 4);
  return (
    // Spring hover lift replaces flat CSS translate — feels physical
    <motion.div
      whileHover={reduced ? {} : { y: -5, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
    >
      <Panel
        glass
        className={cn("overflow-hidden", onSelect && "cursor-pointer")}
        {...(onSelect
          ? {
              role: "button" as const,
              tabIndex: 0,
              onClick: () => onSelect(m),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(m);
                }
              },
            }
          : {})}
      >
        {m.photo_url && (
          <img
            src={m.photo_url}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full bg-muted object-cover"
          />
        )}
        <div className="p-4">
          {m.prompt_text && <p className="text-caption italic leading-snug">{m.prompt_text}</p>}
          {m.body && (
            <p
              className={cn(
                "whitespace-pre-wrap text-[15px] leading-relaxed text-foreground",
                m.prompt_text && "mt-1.5",
              )}
            >
              {m.body}
            </p>
          )}
          {m.location && (
            <p className="mt-2 inline-flex items-center gap-1 text-caption">
              <MapPin className="h-3.5 w-3.5 text-hearth" />
              {m.location}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {who && <UserAvatar profile={who} size="xs" />}
            <span className="text-caption">{who?.full_name?.split(" ")[0] ?? "Someone"}</span>
            {showYear && <span className="text-caption">· {year}</span>}
            {mood && (
              <span className="ml-auto text-base" title={mood.label}>
                {mood.emoji}
              </span>
            )}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
