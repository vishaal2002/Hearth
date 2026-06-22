import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Menu, Plus,
  Search, Users, Calendar as CalendarIcon, X, Bell,
} from "lucide-react";
import { CalendarView, type EventRow } from "@/components/calendar/calendar-view";
import { EventDialog, type EventDraft, type DeleteScope, type AttendanceStatus } from "@/components/calendar/event-dialog";
import { MembersDialog } from "@/components/calendar/members-dialog";
import { EventDetail } from "@/components/calendar/event-detail";
import { UserAvatar, AvatarStack, type ProfileLike } from "@/components/calendar/user-avatar";
import { Wordmark } from "@/components/wordmark";
import { AppFrame, ProfileMenu } from "@/components/app-frame";
import { addDays, EVENT_COLORS, expandRecurring, matchesSearch, sanitizeSearchTerm, startOfDay, startOfMonth, startOfWeek } from "@/lib/calendar-utils";
import { useReminders, requestNotificationPermission, notificationsSupported } from "@/lib/use-reminders";
import { cn } from "@/lib/utils";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Hearth" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    new: typeof search.new === "string" ? search.new : undefined,
    title: typeof search.title === "string" ? search.title : undefined,
  }),
  component: AppPage,
});

type ViewKind = "day" | "3day" | "week" | "month" | "agenda";
type CalendarRow = { id: string; name: string; color: string; owner_id: string; is_personal: boolean };
type MemberRow = { id: string; calendar_id: string; user_id: string; role: "owner" | "editor" | "viewer" };

function AppPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const { new: newIntent, title: seedTitle } = Route.useSearch();
  const [view, setView] = useState<ViewKind>("week");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [hiddenCals, setHiddenCals] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [eventDialog, setEventDialog] = useState<{ open: boolean; draft: EventDraft } | null>(null);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [membersOpen, setMembersOpen] = useState<string | null>(null);
  const [createCalOpen, setCreateCalOpen] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("unsupported");

  // -------- queries --------
  const profileQ = useQuery({
    queryKey: ["me", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data as ProfileLike;
    },
  });

  const calendarsQ = useQuery({
    queryKey: ["calendars", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendars").select("*").order("is_personal", { ascending: false }).order("created_at");
      if (error) throw error;
      return data as CalendarRow[];
    },
  });

  const calendars = calendarsQ.data ?? [];
  const visibleCalendarIds = useMemo(() => calendars.filter((c) => !hiddenCals.has(c.id)).map((c) => c.id), [calendars, hiddenCals]);
  const calendarColorById = useMemo(() => Object.fromEntries(calendars.map((c) => [c.id, c.color])), [calendars]);

  // Date range for query (broad enough for current view)
  const range = useMemo(() => {
    const a = new Date(anchor);
    let start: Date, end: Date;
    if (view === "month") { start = addDays(startOfMonth(a), -7); end = addDays(startOfMonth(new Date(a.getFullYear(), a.getMonth() + 1, 1)), 7); }
    else if (view === "week") { start = startOfWeek(a); end = addDays(start, 7); }
    else if (view === "3day") { start = startOfDay(a); end = addDays(start, 3); }
    else if (view === "agenda") { start = addDays(startOfDay(a), -7); end = addDays(start, 60); }
    else { start = startOfDay(a); end = addDays(start, 1); }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [anchor, view]);

  const eventsQ = useQuery({
    queryKey: ["events", visibleCalendarIds, range.start, range.end, search],
    enabled: visibleCalendarIds.length > 0,
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("*")
        .in("calendar_id", visibleCalendarIds)
        .eq("recurrence", "none")
        .gte("end_at", range.start)
        .lte("start_at", range.end)
        .order("start_at");
      const term = sanitizeSearchTerm(search);
      if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const events = eventsQ.data ?? [];

  // Recurring base events (expanded client-side into occurrences for the range)
  const recurringQ = useQuery({
    queryKey: ["recurring", visibleCalendarIds],
    enabled: visibleCalendarIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("calendar_id", visibleCalendarIds)
        .neq("recurrence", "none");
      if (error) throw error;
      return data as EventRow[];
    },
  });
  const recurringById = useMemo(
    () => Object.fromEntries((recurringQ.data ?? []).map((e) => [e.id, e])),
    [recurringQ.data],
  );

  // All events shown in the calendar = in-range one-offs + expanded recurring occurrences
  const displayEvents = useMemo(() => {
    const rangeStart = new Date(range.start);
    const rangeEnd = new Date(range.end);
    const occurrences = (recurringQ.data ?? [])
      .flatMap((ev) => expandRecurring(ev, rangeStart, rangeEnd))
      .filter((ev) => matchesSearch(ev, search));
    return [...events, ...occurrences];
  }, [events, recurringQ.data, range.start, range.end, search]);

  // Browser reminder notifications (fire while the tab is open)
  useEffect(() => {
    if (notificationsSupported()) setNotifPerm(Notification.permission);
  }, []);
  useReminders(displayEvents, notifPerm === "granted");

  async function enableNotifications() {
    const perm = await requestNotificationPermission();
    setNotifPerm(notificationsSupported() ? perm : "unsupported");
    if (perm === "granted") toast.success("Reminders enabled");
    else if (perm === "denied") toast.error("Notifications are blocked in your browser settings");
  }

  // Profiles for everyone visible (event creators + members of selected calendar)
  const memberIds = useMemo(() => Array.from(new Set(displayEvents.map((e) => e.created_by))), [displayEvents]);
  const profilesQ = useQuery({
    queryKey: ["profiles", memberIds],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("id", memberIds);
      if (error) throw error;
      return data as ProfileLike[];
    },
  });
  const profilesById = useMemo(() => {
    const m: Record<string, ProfileLike> = {};
    (profilesQ.data ?? []).forEach((p) => { m[p.id] = p; });
    if (profileQ.data) m[profileQ.data.id] = profileQ.data;
    return m;
  }, [profilesQ.data, profileQ.data]);

  // Members of currently focused calendar (for share dialog)
  const focusedCalendar = calendars.find((c) => c.id === membersOpen) || null;
  const membersQ = useQuery({
    queryKey: ["members", membersOpen],
    enabled: !!membersOpen,
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_members").select("*").eq("calendar_id", membersOpen!);
      if (error) throw error;
      const rows = data as MemberRow[];
      const ids = rows.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      const pmap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: pmap[r.user_id] })) as Array<MemberRow & { profile: ProfileLike }>;
    },
  });
  const invitationsQ = useQuery({
    queryKey: ["invitations", membersOpen],
    enabled: !!membersOpen,
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("id, invited_email").eq("calendar_id", membersOpen!).eq("accepted", false);
      if (error) throw error;
      return data;
    },
  });

  // Calendar membership for header avatar stack (all members across my calendars, unique)
  const allMembersQ = useQuery({
    queryKey: ["all-members", calendars.map((c) => c.id).join(",")],
    enabled: calendars.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_members").select("user_id").in("calendar_id", calendars.map((c) => c.id));
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      return (profs ?? []) as ProfileLike[];
    },
  });

  // RSVP / going-status for the events currently in view (keyed by base event id).
  const eventIds = useMemo(
    () => Array.from(new Set(displayEvents.map((e) => e.base_id ?? e.id))),
    [displayEvents],
  );
  const attendanceQ = useQuery({
    queryKey: ["attendance", [...eventIds].sort().join(",")],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("event_attendance").select("*").in("event_id", eventIds);
      if (error) throw error;
      return data as { event_id: string; user_id: string; status: AttendanceStatus }[];
    },
  });
  const attendanceByEvent = useMemo(() => {
    const m: Record<string, Record<string, AttendanceStatus>> = {};
    (attendanceQ.data ?? []).forEach((a) => {
      (m[a.event_id] ??= {})[a.user_id] = a.status;
    });
    return m;
  }, [attendanceQ.data]);

  // Profiles for rendering: event creators + everyone in your calendars (so RSVP avatars resolve).
  const profilesForView = useMemo(() => {
    const m = { ...profilesById };
    (allMembersQ.data ?? []).forEach((p) => { m[p.id] = p; });
    return m;
  }, [profilesById, allMembersQ.data]);

  async function setRsvp(eventId: string, status: AttendanceStatus) {
    const { error } = await supabase
      .from("event_attendance")
      .upsert(
        { event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" },
      );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["attendance"] });
  }

  // -------- handlers --------
  function openNewEvent(at?: Date, opts?: { title?: string; allDay?: boolean }) {
    if (calendars.length === 0) return toast.error("No calendar available");
    const start = at ? new Date(at) : new Date();
    if (!at) start.setMinutes(0, 0, 0);
    const end = new Date(start);
    if (opts?.allDay) {
      end.setHours(23, 59, 59, 999);
    } else {
      end.setHours(end.getHours() + 1);
    }
    setEventDialog({
      open: true,
      draft: {
        calendar_id: calendars[0].id,
        title: opts?.title ?? "",
        description: "",
        location: "",
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        all_day: opts?.allDay ?? false,
        color: null,
        reminder_minutes: null,
        recurrence: "none",
        recurrence_until: null,
        recurrence_exdates: [],
      },
    });
  }

  // Deep-link from Today dashboard (?new=today|ahead&title=...)
  useEffect(() => {
    if (!newIntent || calendars.length === 0) return;
    const now = new Date();
    if (newIntent === "today") {
      const start = new Date(now);
      start.setHours(19, 0, 0, 0);
      openNewEvent(start, { title: seedTitle ?? "" });
    } else if (newIntent === "ahead") {
      const start = addDays(startOfDay(now), 14);
      start.setHours(9, 0, 0, 0);
      openNewEvent(start, { title: seedTitle ?? "", allDay: true });
    }
    navigate({ to: "/calendar", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newIntent, calendars.length]);

  // For a recurring occurrence, the editable/deletable row is the underlying series (base).
  function toDraft(ev: EventRow): EventDraft {
    const base = ev.recurring && ev.base_id ? (recurringById[ev.base_id] ?? ev) : ev;
    return {
      id: base.id,
      calendar_id: base.calendar_id,
      title: base.title,
      description: base.description ?? "",
      location: base.location ?? "",
      start_at: base.start_at,
      end_at: base.end_at,
      all_day: base.all_day,
      color: base.color,
      reminder_minutes: base.reminder_minutes ?? null,
      recurrence: (base.recurrence ?? "none") as EventDraft["recurrence"],
      recurrence_until: base.recurrence_until ?? null,
      recurrence_exdates: base.recurrence_exdates ?? [],
      occurrence_date: ev.occurrence_date ?? null,
    };
  }

  function openEditEvent(ev: EventRow) {
    setEventDialog({ open: true, draft: toDraft(ev) });
  }

  const [saving, setSaving] = useState(false);
  async function saveEvent(draft: EventDraft) {
    if (!draft.title.trim()) return toast.error("Title required");
    if (new Date(draft.end_at) <= new Date(draft.start_at)) return toast.error("End must be after start");
    setSaving(true);
    try {
      const recurrenceFields = {
        recurrence: draft.recurrence,
        recurrence_until: draft.recurrence === "none" ? null : draft.recurrence_until,
        recurrence_exdates: draft.recurrence === "none" ? [] : draft.recurrence_exdates,
      };
      if (draft.id) {
        const { error } = await supabase.from("events").update({
          calendar_id: draft.calendar_id,
          title: draft.title.trim(),
          description: draft.description || null,
          location: draft.location || null,
          start_at: draft.start_at,
          end_at: draft.end_at,
          all_day: draft.all_day,
          color: draft.color,
          reminder_minutes: draft.reminder_minutes,
          ...recurrenceFields,
        }).eq("id", draft.id);
        if (error) throw error;
        toast.success("Saved");
      } else {
        const { error } = await supabase.from("events").insert({
          calendar_id: draft.calendar_id,
          created_by: user.id,
          title: draft.title.trim(),
          description: draft.description || null,
          location: draft.location || null,
          start_at: draft.start_at,
          end_at: draft.end_at,
          all_day: draft.all_day,
          color: draft.color,
          reminder_minutes: draft.reminder_minutes,
          ...recurrenceFields,
        });
        if (error) throw error;
        toast.success("Event created");
      }
      setEventDialog(null);
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["recurring"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(draft: EventDraft, scope: DeleteScope) {
    if (!draft.id) return;
    if (scope === "one" && draft.occurrence_date) {
      // Exclude just this occurrence from the recurring series.
      const exdates = Array.from(new Set([...(draft.recurrence_exdates ?? []), draft.occurrence_date]));
      const { error } = await supabase.from("events").update({ recurrence_exdates: exdates }).eq("id", draft.id);
      if (error) return toast.error(error.message);
      toast.success("Occurrence removed");
    } else {
      const { error } = await supabase.from("events").delete().eq("id", draft.id);
      if (error) return toast.error(error.message);
      toast.success("Deleted");
    }
    setEventDialog(null);
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["recurring"] });
  }

  async function moveEvent(ev: EventRow, newStart: Date) {
    const durationMs = new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    const { error } = await supabase
      .from("events")
      .update({ start_at: newStart.toISOString(), end_at: newEnd.toISOString() })
      .eq("id", ev.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["events"] });
    toast.success("Event moved");
  }

  // navigation
  function shift(dir: -1 | 1) {
    const a = new Date(anchor);
    if (view === "month") a.setMonth(a.getMonth() + dir);
    else if (view === "week") a.setDate(a.getDate() + 7 * dir);
    else if (view === "3day") a.setDate(a.getDate() + 3 * dir);
    else a.setDate(a.getDate() + dir);
    setAnchor(a);
  }

  const headerLabel = useMemo(() => {
    if (view === "month") return anchor.toLocaleDateString([], { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString([], { month: "short", day: "numeric" })} – ${e.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [view, anchor]);

  return (
    <AppFrame
      userId={user.id}
      fullBleed
      header={
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/today" className="flex md:hidden items-center mr-2" aria-label="Hearth — today">
            <Wordmark size="sm" />
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <h1 className="font-display text-base sm:text-lg font-semibold truncate flex-1 min-w-0">{headerLabel}</h1>

          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events"
              className="pl-8 h-9 w-48 lg:w-64"
              maxLength={120}
            />
            {search && (
              <button aria-label="Clear" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button onClick={() => openNewEvent()} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">New event</span>
          </Button>

          {notifPerm !== "unsupported" && notifPerm !== "granted" && (
            <Button variant="ghost" size="icon" onClick={enableNotifications} aria-label="Enable reminders">
              <Bell className="h-4 w-4" />
            </Button>
          )}

          <ProfileMenu userId={user.id} />
        </div>

        {/* sub-header: view tabs + mobile date nav */}
        <div className="px-3 sm:px-5 pb-2 flex items-center gap-2 flex-wrap">
          <div className="flex sm:hidden items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as ViewKind)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-2.5">Day</TabsTrigger>
              <TabsTrigger value="3day" className="text-xs px-2.5">3-day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2.5">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2.5">Month</TabsTrigger>
              <TabsTrigger value="agenda" className="text-xs px-2.5">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
          {allMembersQ.data && allMembersQ.data.length > 1 && (
            <div className="ml-auto hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Your people</span>
              <AvatarStack profiles={allMembersQ.data} max={4} size="sm" />
            </div>
          )}
        </div>

        <div className="sm:hidden px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events" className="pl-8 h-9" />
          </div>
        </div>
        </header>
      }
    >
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar p-4 gap-4 overflow-y-auto">
          <SidebarContent
            calendars={calendars}
            hiddenCals={hiddenCals}
            setHiddenCals={setHiddenCals}
            onShare={(id) => setMembersOpen(id)}
            onNewCalendar={() => setCreateCalOpen(true)}
            currentUserId={user.id}
          />
        </aside>

        {/* Sidebar - mobile sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-4 w-72">
            <SidebarContent
              calendars={calendars}
              hiddenCals={hiddenCals}
              setHiddenCals={setHiddenCals}
              onShare={(id) => { setMembersOpen(id); setSidebarOpen(false); }}
              onNewCalendar={() => { setCreateCalOpen(true); setSidebarOpen(false); }}
              currentUserId={user.id}
            />
          </SheetContent>
        </Sheet>

        {/* Main */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 overflow-hidden">
          <div className="h-full">
            {calendars.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-6">
                <div className="max-w-sm space-y-3">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-hearth-muted text-hearth animate-breathe">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold">Making a warm little corner for you…</h2>
                  <p className="text-muted-foreground leading-relaxed">This is the start of your story together. In a moment you can add the first thing you're looking forward to.</p>
                </div>
              </div>
            ) : (
              <CalendarView
                view={view}
                anchor={anchor}
                events={displayEvents}
                profilesById={profilesForView}
                calendarColorById={calendarColorById}
                attendanceByEvent={attendanceByEvent}
                onEventClick={setSelected}
                onSlotClick={openNewEvent}
                onEventMove={moveEvent}
              />
            )}
          </div>
        </main>
      </div>

      {eventDialog && (
        <EventDialog
          open={eventDialog.open}
          onOpenChange={(v) => !v && setEventDialog(null)}
          initial={eventDialog.draft}
          calendars={calendars}
          onSave={saveEvent}
          onDelete={eventDialog.draft.id ? (scope) => deleteEvent(eventDialog.draft, scope) : undefined}
          saving={saving}
          members={allMembersQ.data}
          attendance={eventDialog.draft.id ? attendanceByEvent[eventDialog.draft.id] : undefined}
          currentUserId={user.id}
          onRsvp={eventDialog.draft.id ? (status) => setRsvp(eventDialog.draft.id!, status) : undefined}
        />
      )}

      {focusedCalendar && (
        <MembersDialog
          open={!!membersOpen}
          onOpenChange={(v) => !v && setMembersOpen(null)}
          calendarId={focusedCalendar.id}
          calendarName={focusedCalendar.name}
          isOwner={focusedCalendar.owner_id === user.id}
          members={membersQ.data ?? []}
          pendingInvites={invitationsQ.data ?? []}
        />
      )}

      <CreateCalendarDialog open={createCalOpen} onOpenChange={setCreateCalOpen} userId={user.id} />

      {/* Event detail — a right-side panel, not a modal */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="right" className="w-full p-6 sm:max-w-md">
          {selected && (
            <EventDetail
              event={selected}
              calendarColor={calendarColorById[selected.calendar_id] || EVENT_COLORS[0]}
              members={allMembersQ.data}
              attendance={attendanceByEvent[selected.base_id ?? selected.id]}
              currentUserId={user.id}
              onRsvp={(status) => setRsvp(selected.base_id ?? selected.id, status)}
              onEdit={() => { openEditEvent(selected); setSelected(null); }}
              onDelete={(scope) => { deleteEvent(toDraft(selected), scope); setSelected(null); }}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppFrame>
  );
}

function SidebarContent({
  calendars, hiddenCals, setHiddenCals, onShare, onNewCalendar, currentUserId,
}: {
  calendars: CalendarRow[];
  hiddenCals: Set<string>;
  setHiddenCals: (s: Set<string>) => void;
  onShare: (id: string) => void;
  onNewCalendar: () => void;
  currentUserId: string;
}) {
  function toggle(id: string) {
    const next = new Set(hiddenCals);
    if (next.has(id)) next.delete(id); else next.add(id);
    setHiddenCals(next);
  }
  return (
    <>
      <Link to="/today" className="flex md:hidden items-center mb-2" aria-label="Hearth — today">
        <Wordmark size="sm" />
      </Link>
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Calendars</h2>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onNewCalendar} aria-label="New calendar">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="space-y-1">
        {calendars.map((c) => (
          <li key={c.id} className="group flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-sidebar-accent">
            <Checkbox
              checked={!hiddenCals.has(c.id)}
              onCheckedChange={() => toggle(c.id)}
              className="data-[state=checked]:bg-transparent data-[state=checked]:text-transparent border-0"
              style={{ background: hiddenCals.has(c.id) ? "transparent" : c.color, borderColor: c.color, color: "white" }}
            />
            <span className="flex-1 text-sm truncate">{c.name}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition" onClick={() => onShare(c.id)} aria-label="Share">
              <Users className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4 border-t text-xs text-muted-foreground space-y-2">
        <p className="leading-relaxed">Tip: click any time slot to add an event there.</p>
      </div>
    </>
  );
}

function CreateCalendarDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [busy, setBusy] = useState(false);

  async function create() {
    const parsed = z.string().trim().min(1).max(60).safeParse(name);
    if (!parsed.success) return toast.error("Name required (max 60 chars)");
    setBusy(true);
    const { error } = await supabase.from("calendars").insert({ name: parsed.data, color, owner_id: userId, is_personal: false });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Calendar created");
    setName(""); setColor(EVENT_COLORS[0]);
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: ["calendars"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">New shared calendar</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cal-name">Name</Label>
            <Input id="cal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Family, Team, Trip..." maxLength={60} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {EVENT_COLORS.map((c) => (
                <button key={c} type="button" className={cn("h-7 w-7 rounded-full border-2", color === c ? "border-foreground scale-110" : "border-transparent")} style={{ background: c }} onClick={() => setColor(c)} aria-label={`color ${c}`} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
