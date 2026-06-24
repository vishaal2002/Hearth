import { RsvpControl, type AttendanceStatus, type DeleteScope } from "./event-dialog";
import type { EventRow } from "./calendar-view";
import type { ProfileLike } from "./user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtTime, isMilestoneEvent } from "@/lib/calendar-utils";
import { CalendarDays, ChevronDown, Clock, MapPin, Pencil, Repeat, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EventDetail({
  event,
  calendarColor,
  members,
  attendance,
  currentUserId,
  canEdit = true,
  onRsvp,
  onEdit,
  onDelete,
}: {
  event: EventRow;
  calendarColor: string;
  members?: ProfileLike[];
  attendance?: Record<string, AttendanceStatus>;
  currentUserId?: string;
  canEdit?: boolean;
  onRsvp?: (status: AttendanceStatus) => void;
  onEdit: () => void;
  onDelete?: (scope: DeleteScope) => void;
}) {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const recurring = !!event.recurring || (!!event.recurrence && event.recurrence !== "none");
  const milestone = isMilestoneEvent(event);
  const color = event.color || calendarColor;
  const dateStr = start.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeStr = event.all_day ? "All day" : `${fmtTime(start)} – ${fmtTime(end)}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} />
            {milestone && <Badge icon={Sparkles}>Milestone</Badge>}
            {recurring && !milestone && <Badge icon={Repeat}>Repeats</Badge>}
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">{event.title}</h2>
        </div>

        <div className="space-y-2.5">
          <DetailRow icon={CalendarDays}>{dateStr}</DetailRow>
          <DetailRow icon={Clock}>{timeStr}</DetailRow>
          {event.location && <DetailRow icon={MapPin}>{event.location}</DetailRow>}
        </div>

        {event.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        )}

        {members && members.length > 0 && onRsvp && (
          <RsvpControl members={members} attendance={attendance} currentUserId={currentUserId} onRsvp={onRsvp} />
        )}
      </div>

      {canEdit && (
        <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-4">
          <Button onClick={onEdit} className="flex-1">
            <Pencil className="h-4 w-4" />Edit
          </Button>
          {onDelete && (
            recurring ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" /><ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onDelete("one")}>This occurrence</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDelete("all")}>All events in the series</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete("all")} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </div>
  );
}

function Badge({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
      <Icon className="h-3 w-3 text-primary" />{children}
    </span>
  );
}
