import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, eventsOnDay, fmtTime, isMilestoneEvent, isSameDay, startOfDay, startOfMonth, startOfWeek } from "@/lib/calendar-utils";
import { UserAvatar, AvatarStack, type ProfileLike } from "./user-avatar";
import { cn } from "@/lib/utils";
import { Repeat, Sparkles } from "lucide-react";

export type EventRow = {
  id: string;
  calendar_id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string | null;
  reminder_minutes?: number | null;
  recurrence?: string | null;
  recurrence_until?: string | null;
  recurrence_exdates?: string[] | null;
  // present on expanded recurring occurrences:
  recurring?: boolean;
  base_id?: string;
  occurrence_date?: string;
};

type Props = {
  view: "day" | "3day" | "week" | "month" | "agenda";
  anchor: Date;
  events: EventRow[];
  profilesById: Record<string, ProfileLike>;
  calendarColorById: Record<string, string>;
  /** base event id -> { userId: status } */
  attendanceByEvent?: Record<string, Record<string, string>>;
  onEventClick: (e: EventRow) => void;
  onSlotClick: (start: Date) => void;
  onEventMove?: (e: EventRow, newStart: Date) => void;
};

function goingProfiles(
  ev: EventRow,
  attendanceByEvent: Record<string, Record<string, string>> | undefined,
  profilesById: Record<string, ProfileLike>,
): ProfileLike[] {
  const map = attendanceByEvent?.[ev.base_id ?? ev.id];
  if (!map) return [];
  return Object.entries(map)
    .filter(([, s]) => s === "going")
    .map(([uid]) => profilesById[uid])
    .filter(Boolean);
}

const HOUR_HEIGHT = 56; // px

export function CalendarView(props: Props) {
  if (props.view === "month") return <MonthView {...props} />;
  if (props.view === "agenda") return <AgendaView {...props} />;
  return <TimeGridView {...props} />;
}

function isRecurringEvent(ev: EventRow) {
  return ev.recurring || (ev.recurrence && ev.recurrence !== "none");
}

function TimeGridView({ view, anchor, events, profilesById, calendarColorById, onEventClick, onSlotClick, onEventMove }: Props) {
  const days = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    if (view === "3day") return [0, 1, 2].map((i) => addDays(startOfDay(anchor), i));
    const s = startOfWeek(anchor);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(s, i));
  }, [anchor, view]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // ---- drag-to-reschedule (timed, non-recurring events) ----
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ ev: EventRow; startX: number; startY: number; dayIndex: number } | null>(null);
  const movedRef = useRef(false);
  const [preview, setPreview] = useState<{ id: string; deltaMin: number; dayDelta: number } | null>(null);
  const dragging = preview !== null;

  function onEventPointerDown(e: React.PointerEvent, ev: EventRow, dayIndex: number) {
    if (!onEventMove || isRecurringEvent(ev) || ev.all_day) return;
    e.preventDefault();
    e.stopPropagation();
    movedRef.current = false;
    dragStartRef.current = { ev, startX: e.clientX, startY: e.clientY, dayIndex };
    setPreview({ id: ev.id, deltaMin: 0, dayDelta: 0 });
  }

  useEffect(() => {
    if (!dragging) return;
    function move(e: PointerEvent) {
      const s = dragStartRef.current;
      if (!s) return;
      const dy = e.clientY - s.startY;
      const dx = e.clientX - s.startX;
      const colWidth = gridRef.current ? (gridRef.current.clientWidth - 56) / days.length : 0;
      const deltaMin = Math.round(((dy / HOUR_HEIGHT) * 60) / 15) * 15;
      let dayDelta = colWidth ? Math.round(dx / colWidth) : 0;
      dayDelta = Math.max(-s.dayIndex, Math.min(days.length - 1 - s.dayIndex, dayDelta));
      if (deltaMin !== 0 || dayDelta !== 0) movedRef.current = true;
      setPreview({ id: s.ev.id, deltaMin, dayDelta });
    }
    function up() {
      const s = dragStartRef.current;
      setPreview((p) => {
        if (s && p && onEventMove && (p.deltaMin !== 0 || p.dayDelta !== 0)) {
          const ns = new Date(s.ev.start_at);
          ns.setDate(ns.getDate() + p.dayDelta);
          ns.setMinutes(ns.getMinutes() + p.deltaMin);
          onEventMove(s.ev, ns);
        }
        return null;
      });
      dragStartRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, days.length, onEventMove]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-warm">
      {/* Day header */}
      <div className="flex border-b bg-card sticky top-0 z-10">
        <div className="w-14 shrink-0" />
        {days.map((d) => {
          const today = isSameDay(d, new Date());
          return (
            <div key={d.toISOString()} className="flex-1 px-2 py-2 text-center border-l first:border-l-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {d.toLocaleDateString([], { weekday: "short" })}
              </div>
              <div className={cn(
                "mx-auto mt-0.5 inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-full text-sm font-semibold transition",
                today && "bg-gradient-to-b from-primary to-primary-deep text-primary-foreground animate-breathe"
              )}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative" ref={gridRef}>
          {/* hours gutter */}
          <div className="w-14 shrink-0 border-r">
            {hours.map((h) => (
              <div key={h} className="relative text-[10px] text-muted-foreground pr-1 text-right" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-1.5 right-1">{h === 0 ? "" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}</span>
              </div>
            ))}
          </div>

          {days.map((d, dayIndex) => {
            const dayEvents = eventsOnDay(events, d);
            const allDay = dayEvents.filter((e) => e.all_day);
            const timed = dayEvents.filter((e) => !e.all_day);
            return (
              <div key={d.toISOString()} className="flex-1 relative border-l first:border-l-0">
                {/* hour cells */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-b border-border/60 hover:bg-accent/30 cursor-pointer"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => {
                      const start = new Date(d);
                      start.setHours(h, 0, 0, 0);
                      onSlotClick(start);
                    }}
                  />
                ))}

                {/* all-day chips at top */}
                {allDay.length > 0 && (
                  <div className="absolute left-1 right-1 top-1 space-y-0.5 z-10">
                    {allDay.map((ev) => (
                      <EventChip key={ev.id} ev={ev} profile={profilesById[ev.created_by]} color={ev.color || calendarColorById[ev.calendar_id]} onClick={() => onEventClick(ev)} compact />
                    ))}
                  </div>
                )}

                {/* timed events */}
                {timed.map((ev) => {
                  const start = new Date(ev.start_at);
                  const end = new Date(ev.end_at);
                  const dayStart = startOfDay(d).getTime();
                  const top = Math.max(0, (start.getTime() - dayStart) / 3_600_000) * HOUR_HEIGHT;
                  const height = Math.max(20, ((end.getTime() - start.getTime()) / 3_600_000) * HOUR_HEIGHT - 2);
                  const color = ev.color || calendarColorById[ev.calendar_id] || "#f97316";
                  const profile = profilesById[ev.created_by];
                  const draggable = !!onEventMove && !isRecurringEvent(ev);
                  const isDragged = preview?.id === ev.id;
                  const transform = isDragged
                    ? `translate(${preview!.dayDelta * 100}%, ${(preview!.deltaMin / 60) * HOUR_HEIGHT}px)`
                    : undefined;
                  return (
                    <button
                      key={ev.id}
                      onPointerDown={(e) => onEventPointerDown(e, ev, dayIndex)}
                      onClick={() => {
                        if (movedRef.current) { movedRef.current = false; return; }
                        onEventClick(ev);
                      }}
                      className={cn(
                        "absolute left-1 right-1 rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm hover:brightness-95 transition-[filter] overflow-hidden",
                        draggable && "cursor-grab active:cursor-grabbing",
                        isDragged && "z-20 ring-2 ring-primary/60 shadow-lg",
                      )}
                      style={{ top, height, background: color + "22", borderLeft: `3px solid ${color}`, transform, touchAction: "none" }}
                    >
                      <div className="flex items-start gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate flex items-center gap-1">
                            {isRecurringEvent(ev) && <Repeat className="h-3 w-3 shrink-0 opacity-70" />}
                            <span className="truncate">{ev.title}</span>
                          </div>
                          {height > 28 && <div className="text-muted-foreground truncate">{fmtTime(start)}</div>}
                        </div>
                        {profile && <UserAvatar profile={profile} size="xs" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventChip({ ev, profile, color, onClick, compact, draggable, onDragStart }: {
  ev: EventRow; profile?: ProfileLike; color: string; onClick: () => void; compact?: boolean;
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn("w-full flex items-center gap-1 rounded px-1.5 text-left text-[10.5px] hover:brightness-95", compact ? "py-0.5" : "py-1", draggable && "cursor-grab active:cursor-grabbing")}
      style={{ background: color + "22", borderLeft: `3px solid ${color}` }}
    >
      {isMilestoneEvent(ev) ? <Sparkles className="h-2.5 w-2.5 shrink-0 text-primary" /> : isRecurringEvent(ev) && <Repeat className="h-2.5 w-2.5 shrink-0 opacity-70" />}
      <span className="font-semibold truncate flex-1 text-foreground">{ev.title}</span>
      {profile && <UserAvatar profile={profile} size="xs" />}
    </button>
  );
}

function MonthView({ anchor, events, profilesById, calendarColorById, onEventClick, onSlotClick, onEventMove }: Props) {
  const grid = useMemo(() => {
    const first = startOfMonth(anchor);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const eventsById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentMonth = anchor.getMonth();

  function handleDrop(e: React.DragEvent, day: Date) {
    if (!onEventMove) return;
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const ev = eventsById[id];
    if (!ev) return;
    const orig = new Date(ev.start_at);
    const newStart = new Date(day);
    newStart.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
    onEventMove(ev, newStart);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-warm">
      <div className="grid grid-cols-7 border-b bg-card text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        {weekdays.map((d) => (<div key={d} className="py-2">{d}</div>))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {grid.map((d, i) => {
          const dayEvents = eventsOnDay(events, d);
          const inMonth = d.getMonth() === currentMonth;
          const today = isSameDay(d, new Date());
          return (
            <div
              key={i}
              className={cn("border-b border-l p-1 min-h-0 overflow-hidden flex flex-col gap-0.5 cursor-pointer hover:bg-accent/30 transition",
                !inMonth && "bg-muted/30 text-muted-foreground",
                i % 7 === 0 && "border-l-0",
              )}
              onClick={() => { const s = new Date(d); s.setHours(9, 0, 0, 0); onSlotClick(s); }}
              onDragOver={(e) => { if (onEventMove) e.preventDefault(); }}
              onDrop={(e) => handleDrop(e, d)}
            >
              <div className="flex justify-end">
                <span className={cn(
                  "inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full text-[12px] font-semibold",
                  today && "bg-gradient-to-b from-primary to-primary-deep text-primary-foreground animate-breathe"
                )}>{d.getDate()}</span>
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => {
                  const draggable = !!onEventMove && !isRecurringEvent(ev);
                  return (
                    <div key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                      <EventChip
                        ev={ev}
                        profile={profilesById[ev.created_by]}
                        color={ev.color || calendarColorById[ev.calendar_id] || "#f97316"}
                        onClick={() => onEventClick(ev)}
                        compact
                        draggable={draggable}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", ev.id)}
                      />
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaView({ events, profilesById, calendarColorById, attendanceByEvent, onEventClick }: Props) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [events],
  );
  const groups = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    sorted.forEach((e) => {
      const key = startOfDay(new Date(e.start_at)).toISOString();
      const arr = m.get(key) || [];
      arr.push(e);
      m.set(key, arr);
    });
    return Array.from(m.entries());
  }, [sorted]);

  return (
    <div className="rounded-2xl border bg-card shadow-warm overflow-y-auto h-full">
      {groups.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Nothing here yet — a little quiet is nice too. <span className="font-hand text-base text-primary">Add something to look forward to.</span></p>
      ) : (
        groups.map(([key, evs]) => {
          const d = new Date(key);
          return (
            <div key={key} className="border-b last:border-b-0">
              <div className="sticky top-0 bg-secondary/50 backdrop-blur px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/80">
                {d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
              </div>
              <div className="divide-y">
                {evs.map((ev) => {
                  const color = ev.color || calendarColorById[ev.calendar_id] || "#f97316";
                  const profile = profilesById[ev.created_by];
                  const going = goingProfiles(ev, attendanceByEvent, profilesById);
                  return (
                    <button key={ev.id} onClick={() => onEventClick(ev)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/40 transition">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          {isMilestoneEvent(ev) ? <Sparkles className="h-3 w-3 shrink-0 text-primary" /> : isRecurringEvent(ev) && <Repeat className="h-3 w-3 shrink-0 opacity-70" />}
                          <span className="truncate">{ev.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {ev.all_day ? "All day" : `${fmtTime(new Date(ev.start_at))} – ${fmtTime(new Date(ev.end_at))}`}
                          {ev.location && ` · ${ev.location}`}
                        </div>
                      </div>
                      {going.length > 0 ? (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <AvatarStack profiles={going} max={3} size="xs" />
                          <span className="text-[11px] font-medium text-primary">going</span>
                        </span>
                      ) : (
                        profile && <UserAvatar profile={profile} size="sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
