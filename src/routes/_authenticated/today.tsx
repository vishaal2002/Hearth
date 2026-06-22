import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppFrame } from "@/components/app-frame";
import { Panel, Overline, EmptyState } from "@/components/hearth";
import {
  EmberButton,
  GhostButton,
  MomentReveal,
  PromptHero,
  RitualSheet,
  Seal,
  YourMoment,
} from "@/components/amber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/calendar/user-avatar";
import { toast } from "sonner";
import {
  AheadEmptyActions,
  CountdownRing,
  DashboardItem,
  DashboardStagger,
  EventRowVisual,
  QuietDayCard,
  TimeOfDayBanner,
  TodayEmptyActions,
  WeekStrip,
} from "@/components/today/dashboard-widgets";
import { CalendarPlus, ChevronRight, Mail, Sparkles, Users } from "lucide-react";
import { promptForDate, todayISODate } from "@/lib/prompts";
import { errorMessage, invitePartner } from "@/lib/space";
import { useSpace } from "@/lib/use-space";
import { haptic } from "@/lib/haptics";
import { addDays, expandRecurring, fmtTime, isSameDay, startOfDay, startOfWeek } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/components/calendar/calendar-view";
import type { ProfileLike } from "@/components/calendar/user-avatar";
import type { Database } from "@/integrations/supabase/types";

type Moment = Database["public"]["Tables"]["moments"]["Row"];

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({ meta: [{ title: "Today — Hearth" }] }),
  component: TodayPage,
});

function dateMinusYear(d = new Date()) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() - 1);
  return x;
}

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function daysUntil(target: Date, now = new Date()) {
  return Math.round((startOfDay(target).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

function countdownLabel(n: number) {
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `${n} days`;
}

function TodayPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const prompt = useMemo(() => promptForDate(), []);
  const today = todayISODate();

  const { space, spaceQ, peopleQ, me, others, profileById } = useSpace(user.id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const eventsQ = useQuery({
    queryKey: ["space-events", space?.id],
    enabled: !!space,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("calendar_id", space!.id).order("start_at");
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const now = new Date();
  const occurrences = useMemo(() => {
    const base = eventsQ.data ?? [];
    const winStart = startOfDay(now);
    const winEnd = addDays(winStart, 365);
    const oneoffs = base.filter((e) => (e.recurrence ?? "none") === "none");
    const recurring = base.filter((e) => (e.recurrence ?? "none") !== "none").flatMap((e) => expandRecurring(e, winStart, winEnd));
    return [...oneoffs, ...recurring]
      .filter((e) => new Date(e.end_at) >= winStart)
      .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsQ.data]);

  const todaysEvents = useMemo(
    () => occurrences.filter((e) => isSameDay(new Date(e.start_at), now) || (new Date(e.start_at) <= now && new Date(e.end_at) >= now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occurrences],
  );
  const nextEvent = useMemo(
    () => occurrences.find((e) => new Date(e.start_at) > now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occurrences],
  );
  const weekDays = useMemo(() => {
    const start = startOfWeek(now);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const has = occurrences.some((e) => isSameDay(new Date(e.start_at), d));
      return { date: d, has, isToday: isSameDay(d, now) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrences]);

  const todayQ = useQuery({
    queryKey: ["moments-today", space?.id, today],
    enabled: !!space,
    queryFn: async () => {
      const { data, error } = await supabase.from("moments").select("*").eq("calendar_id", space!.id).eq("kind", "reflection").eq("happened_on", today);
      if (error) throw error;
      return data as Moment[];
    },
  });

  const lastYear = todayISODate(dateMinusYear());
  const lastYearQ = useQuery({
    queryKey: ["moments-last-year", space?.id, lastYear],
    enabled: !!space,
    queryFn: async () => {
      const { data } = await supabase.from("moments").select("*").eq("calendar_id", space!.id).eq("happened_on", lastYear).order("created_at");
      return (data ?? []) as Moment[];
    },
  });

  const mine = (todayQ.data ?? []).find((m) => m.created_by === user.id) ?? null;
  const theirs = (todayQ.data ?? []).filter((m) => m.created_by !== user.id);
  const sharedTodayIds = useMemo(() => new Set((todayQ.data ?? []).map((m) => m.created_by)), [todayQ.data]);

  const dateLabel = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const firstName = me?.full_name?.split(" ")[0] ?? "";
  const bothEmpty = todaysEvents.length === 0 && !nextEvent;
  const countdownDays = nextEvent ? daysUntil(new Date(nextEvent.start_at)) : 0;

  function refresh() { qc.invalidateQueries({ queryKey: ["moments-today"] }); }

  async function saveMoment() {
    if (!space) return;
    if (!body.trim() && !mood) return toast.error("Add a word or a feeling first");
    setSaving(true);
    const { error } = await supabase.from("moments").insert({
      calendar_id: space.id, created_by: user.id, kind: "reflection",
      prompt_key: prompt.key, prompt_text: prompt.text, mood,
      body: body.trim() || null, happened_on: today,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    haptic("success");
    toast.success("Kept");
    setSheetOpen(false);
    setBody("");
    setMood(null);
    refresh();
  }

  async function undoMine() {
    if (!mine) return;
    const { error } = await supabase.from("moments").delete().eq("id", mine.id);
    if (error) return toast.error(error.message);
    toast.success("Taken back");
    refresh();
  }

  function openCompose() {
    if (mine) return;
    haptic("light");
    setSheetOpen(true);
  }

  return (
    <AppFrame userId={user.id} maxWidth="wide" onQuickAddQuestion={openCompose}>
      {spaceQ.isLoading && (
        <div className="flex justify-center py-24">
          <span className="h-5 w-5 animate-pulse rounded-full bg-muted-foreground/30" aria-label="Loading" />
        </div>
      )}

      {!spaceQ.isLoading && !space && (
        <EmptyState
          title="Create your shared space"
          description="Name the home you'll keep together — then invite the people you want to share days with."
          action={<Link to="/welcome"><Button size="lg">Get started</Button></Link>}
        />
      )}

      {space && (
        <>
          {/* Hero header */}
          <header className="relative mb-8">
            <TimeOfDayBanner hour={now.getHours()} />
            <Overline>{dateLabel}</Overline>
            <div className="relative mt-1 flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-display text-foreground">
                {greeting()}{firstName ? `, ${firstName}` : ""}
              </h1>
              {me && (
                <div className="flex items-center -space-x-2">
                  {[me, ...others].map((p) => (
                    <span key={p.id} className="relative rounded-full ring-2 ring-background">
                      <UserAvatar profile={p} size="md" ring />
                      {sharedTodayIds.has(p.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-hearth ring-2 ring-background" aria-label="Shared today" />
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          <DashboardStagger className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px] xl:items-start">
            <div className="flex flex-col gap-5">
              {others.length === 0 && peopleQ.isSuccess && (
                <DashboardItem>
                  <Panel className="p-5">
                    <InviteStrip spaceId={space.id} />
                  </Panel>
                </DashboardItem>
              )}

              {bothEmpty && (
                <DashboardItem>
                  <QuietDayCard onCheckIn={openCompose} />
                </DashboardItem>
              )}

              {!bothEmpty && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <DashboardItem>
                    <Panel className="p-5 sm:p-6">
                      <Overline>Next up</Overline>
                      {todaysEvents.length === 0 ? (
                        <TodayEmptyActions onCheckIn={openCompose} />
                      ) : (
                        <ul className="mt-4 space-y-1">
                          {todaysEvents.map((e) => (
                            <EventRowVisual
                              key={e.id}
                              time={e.all_day ? "All day" : fmtTime(new Date(e.start_at))}
                              title={e.title}
                              color={e.color ?? space.color}
                            />
                          ))}
                        </ul>
                      )}
                    </Panel>
                  </DashboardItem>

                  <DashboardItem>
                    <Panel
                      raised
                      className={cn(
                        "relative overflow-hidden p-5 sm:p-6",
                        nextEvent && "border-hearth/20",
                      )}
                    >
                      {nextEvent && (
                        <div
                          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-hearth/10 blur-2xl"
                          aria-hidden
                        />
                      )}
                      <Overline>Looking forward to</Overline>
                      {nextEvent ? (
                        <Link to="/calendar" className="relative mt-4 flex items-center gap-4 group">
                          <CountdownRing days={countdownDays} color={space.color} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-hearth">{countdownLabel(countdownDays)}</p>
                            <p className="mt-0.5 text-title truncate">{nextEvent.title}</p>
                            <p className="mt-1 text-caption">
                              {new Date(nextEvent.start_at).toLocaleDateString([], {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      ) : (
                        <AheadEmptyActions />
                      )}
                    </Panel>
                  </DashboardItem>
                </div>
              )}

              {/* Daily question */}
              <DashboardItem>
                <Panel className="relative overflow-hidden p-5 sm:p-6">
                  {!mine && (
                    <div className="pointer-events-none absolute -left-4 top-0 h-24 w-24 rounded-full bg-hearth/8 blur-2xl" aria-hidden />
                  )}
                  <div className="relative flex items-center justify-between">
                    <Overline>Today&apos;s question</Overline>
                    {!mine && (
                      <Button variant="ghost" size="sm" onClick={openCompose} className="text-hearth">
                        Answer <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <PromptHero prompt={prompt.text} answered={!!mine} onTap={openCompose} />
                  {mine && <YourMoment moment={mine} you={profileById[user.id]} onEdit={undoMine} />}

                  {others.length > 0 && (
                    <section className="relative mt-6 border-t border-border pt-6">
                      {!mine ? (
                        <Seal partnerName={others[0]?.full_name?.split(" ")[0] || "them"} waiting={theirs.length > 0} />
                      ) : theirs.length > 0 ? (
                        <div className="space-y-4">
                          <Overline>What they kept</Overline>
                          {theirs.map((m) => (
                            <MomentReveal key={m.id} moment={m} who={profileById[m.created_by]} animate />
                          ))}
                        </div>
                      ) : (
                        <p className="text-caption">Nothing from them yet — you got here first.</p>
                      )}
                    </section>
                  )}
                </Panel>
              </DashboardItem>

              {(lastYearQ.data?.length ?? 0) > 0 && (
                <DashboardItem>
                  <Panel className="p-5 sm:p-6">
                    <Overline>One year ago today</Overline>
                    <div className="mt-4 space-y-4">
                      {lastYearQ.data!.map((m) => (
                        <MomentReveal key={m.id} moment={m} who={profileById[m.created_by]} faded animate={false} />
                      ))}
                    </div>
                  </Panel>
                </DashboardItem>
              )}
            </div>

            {/* Right rail */}
            <aside className="flex flex-col gap-5">
              <DashboardItem>
                <Panel className="p-5">
                  <Overline>This week</Overline>
                  <WeekStrip days={weekDays} />
                </Panel>
              </DashboardItem>

              <DashboardItem>
                <Panel className="p-5">
                  <Overline>Your people</Overline>
                  <ul className="mt-4 space-y-3">
                    {[me, ...others].filter(Boolean).map((p) => (
                      <li key={(p as ProfileLike).id} className="flex items-center gap-2.5">
                        <UserAvatar profile={p as ProfileLike} size="sm" ring />
                        <span className="flex-1 truncate text-sm">
                          {(p as ProfileLike).id === user.id ? "You" : (p as ProfileLike).full_name || (p as ProfileLike).email}
                        </span>
                        {sharedTodayIds.has((p as ProfileLike).id) && (
                          <span className="text-[11px] font-medium text-hearth">shared</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {others.length === 0 && (
                    <p className="mt-3 text-caption">Invite someone to make it warmer.</p>
                  )}
                </Panel>
              </DashboardItem>

              <DashboardItem>
                <Panel className="p-5">
                  <Overline>Explore</Overline>
                  <nav className="mt-3 space-y-1">
                    <QuickLink to="/calendar" icon={<CalendarPlus className="h-4 w-4" />} label="Full calendar" />
                    <QuickLink to="/memories" icon={<Sparkles className="h-4 w-4" />} label="All memories" />
                    <QuickLink to="/together" icon={<Users className="h-4 w-4" />} label="Lists & goals" />
                  </nav>
                </Panel>
              </DashboardItem>
            </aside>
          </DashboardStagger>
        </>
      )}

      {space && (
        <RitualSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          prompt={prompt.text}
          mood={mood}
          onMoodChange={setMood}
          body={body}
          onBodyChange={setBody}
          onSave={saveMoment}
          saving={saving}
        />
      )}
    </AppFrame>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
      {icon}
      {label}
      <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
    </Link>
  );
}


function InviteStrip({ spaceId }: { spaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const result = await invitePartner(spaceId, email);
      toast.success(result.kind === "added" ? "They're in" : "Invite sent");
      qc.invalidateQueries({ queryKey: ["space-people"] });
      setOpen(false);
      setEmail("");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't send invite"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-hearth-muted text-hearth">
          <Mail className="h-4 w-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium">Invite your people</span>
          <span className="block text-caption">Hearth is warmer shared.</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <Overline>Invite by email</Overline>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="them@example.com"
          className="h-10 pl-10"
          onKeyDown={(e) => e.key === "Enter" && send()}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <EmberButton size="sm" onClick={send} loading={busy} disabled={!email.trim()}>Send</EmberButton>
        <GhostButton onClick={() => setOpen(false)}>Not now</GhostButton>
      </div>
    </div>
  );
}
