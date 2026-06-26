import { MemoryCard, type Moment } from "./memory-card";
import type { ProfileLike } from "@/components/calendar/user-avatar";

/**
 * Pinterest-style masonry: CSS columns let cards of varying height pack
 * tightly without a layout library. `break-inside-avoid` keeps a card whole.
 */
export function ScrapbookView({
  moments,
  profileById,
  onSelect,
}: {
  moments: Moment[];
  profileById: Record<string, ProfileLike>;
  onSelect: (m: Moment) => void;
}) {
  return (
    <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 [column-fill:_balance]">
      {moments.map((m) => (
        <div key={m.id} className="mb-3 break-inside-avoid">
          <MemoryCard m={m} who={profileById[m.created_by]} showYear onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
