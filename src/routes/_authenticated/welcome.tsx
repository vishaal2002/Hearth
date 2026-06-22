import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, CalendarHeart, Heart, Home, Loader2, Mail, Plus, Sparkles, Users, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLORS } from "@/lib/calendar-utils";
import { createSharedSpace, errorMessage, invitePartner } from "@/lib/space";
import { z } from "zod";

const authRoute = getRouteApi("/_authenticated");

export const Route = createFileRoute("/_authenticated/welcome")({
  ssr: false,
  head: () => ({ meta: [{ title: "Welcome — Hearth" }] }),
  component: WelcomePage,
});

type SpaceType = "couple" | "family" | "friends" | "circle";

const SPACE_TYPES: { key: SpaceType; label: string; note: string; icon: LucideIcon }[] = [
  { key: "couple", label: "My partner", note: "just the two of us", icon: Heart },
  { key: "family", label: "My family", note: "the whole household", icon: Home },
  { key: "friends", label: "Close friends", note: "my favorite people", icon: Users },
  { key: "circle", label: "Someone special", note: "someone I love", icon: Sparkles },
];

const NAME_SUGGESTIONS: Record<SpaceType, string[]> = {
  couple: ["Us", "Home", "Ours"],
  family: ["The Family", "Home", "Us"],
  friends: ["The Group", "The Crew", "Us"],
  circle: ["Us", "Together", "Ours"],
};

const ACCENT_SWATCHES = [
  { hex: EVENT_COLORS[0], label: "Ember" },
  { hex: EVENT_COLORS[1], label: "Marigold" },
  { hex: EVENT_COLORS[2], label: "Rose" },
  { hex: EVENT_COLORS[3], label: "Sage" },
  { hex: EVENT_COLORS[4], label: "Sky" },
  { hex: EVENT_COLORS[5], label: "Dusk" },
  { hex: EVENT_COLORS[6], label: "Clay" },
  { hex: EVENT_COLORS[7], label: "Teal" },
] as const;

const DATE_SUGGESTIONS: Record<SpaceType, { title: string; yearly: boolean }[]> = {
  couple: [
    { title: "Our anniversary", yearly: true },
    { title: "Their birthday", yearly: true },
    { title: "A trip we're planning", yearly: false },
  ],
  family: [
    { title: "A birthday", yearly: true },
    { title: "Family dinner", yearly: false },
    { title: "A trip", yearly: false },
  ],
  friends: [
    { title: "Someone's birthday", yearly: true },
    { title: "Next time we meet", yearly: false },
    { title: "A trip together", yearly: false },
  ],
  circle: [
    { title: "An important date", yearly: true },
    { title: "A birthday", yearly: true },
    { title: "Something to look forward to", yearly: false },
  ],
};

const nameSchema = z.string().trim().min(1, "Give your place a name").max(60);

type Step = "type" | "space" | "person" | "dates" | "ready";
const STEPS: Step[] = ["type", "space", "person", "dates", "ready"];

type DateRow = { title: string; date: string; yearly: boolean };

function WelcomePage() {
  const { user } = authRoute.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("type");
  const [spaceType, setSpaceType] = useState<SpaceType>("couple");
  const [name, setName] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [email, setEmail] = useState("");
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [rows, setRows] = useState<DateRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function createSpace() {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const id = await createSharedSpace(user.id, parsed.data, color);
      setSpaceId(id);
      // Best-effort: persist the Space type (no-op if the migration isn't applied yet).
      await supabase.from("calendars").update({ space_type: spaceType }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["space"] });
      qc.invalidateQueries({ queryKey: ["calendars"] });
      qc.invalidateQueries({ queryKey: ["me", user.id] });
      setStep("person");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't create your place"));
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite(skip = false) {
    if (skip) return setStep("dates");
    if (!spaceId) return;
    setBusy(true);
    try {
      const result = await invitePartner(spaceId, email);
      toast.success(result.kind === "added" ? "They're in 🤍" : "Invite saved — they'll join when they sign up");
      qc.invalidateQueries({ queryKey: ["space-people"] });
      qc.invalidateQueries({ queryKey: ["invitations"] });
      setEmail("");
      setStep("dates");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't send invite"));
    } finally {
      setBusy(false);
    }
  }

  async function saveDates(skip = false) {
    const valid = rows.filter((r) => r.title.trim() && r.date);
    if (!skip && valid.length > 0 && spaceId) {
      setBusy(true);
      const payload = valid.map((r) => ({
        calendar_id: spaceId,
        created_by: user.id,
        title: r.title.trim(),
        start_at: new Date(`${r.date}T09:00:00`).toISOString(),
        end_at: new Date(`${r.date}T10:00:00`).toISOString(),
        all_day: true,
        recurrence: r.yearly ? "yearly" : "none",
      }));
      const { error } = await supabase.from("events").insert(payload);
      setBusy(false);
      if (error) return toast.error(errorMessage(error, "Couldn't save those dates"));
      qc.invalidateQueries({ queryKey: ["space-events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(valid.length === 1 ? "Added to your calendar" : `${valid.length} dates added`);
    }
    setStep("ready");
  }

  function finish() {
    navigate({ to: "/today", replace: true });
  }

  function addRow(seed?: { title: string; yearly: boolean }) {
    setRows((r) => [...r, { title: seed?.title ?? "", date: "", yearly: seed?.yearly ?? false }]);
  }
  function updateRow(i: number, patch: Partial<DateRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const stepIndex = STEPS.indexOf(step);
  const isCouple = spaceType === "couple";

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute -left-1/4 -top-32 h-72 w-[150%] rounded-[100%] hearth-gradient blur-2xl"
        aria-hidden
      />

      <header className="relative z-10 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Wordmark size="sm" />
        <ProgressDots count={STEPS.length} current={stepIndex} />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        {step === "type" && (
          <div>
            <p className="text-overline text-hearth">Welcome to Hearth</p>
            <h1 className="mt-2 font-display text-display">
              Who are you sharing<br />life with?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Hearth is a warm, shared calendar — for the people you want to stay close to.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {SPACE_TYPES.map(({ key, label, note, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSpaceType(key); setName(""); }}
                  aria-pressed={spaceType === key}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-3xl border bg-card p-4 text-left transition-all active:scale-[0.98]",
                    spaceType === key ? "border-primary/60 ring-2 ring-primary/20" : "border-border/60 hover:border-primary/30",
                  )}
                >
                  <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", spaceType === key ? "bg-primary text-primary-foreground" : "bg-accent text-primary")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{note}</span>
                </button>
              ))}
            </div>

            <Button size="lg" className="mt-7 w-full" onClick={() => setStep("space")}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "space" && (
          <div>
            <p className="text-overline text-hearth">Before anything else</p>
            <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              Name the place<br />you&apos;ll keep together
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A warm home for your shared days — plans ahead, and the moments worth keeping.
            </p>

            <StationerySheet className="mt-7">
              <label htmlFor="space-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What do you call it?
              </label>
              <Input
                id="space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isCouple ? "Jordan & Sam" : "The Family"}
                maxLength={60}
                autoFocus
                className="mt-2 h-12 rounded-2xl border-transparent bg-secondary/50 px-4 text-base shadow-inner focus-visible:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && createSpace()}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {NAME_SUGGESTIONS[spaceType].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setName(s)}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm transition-all active:scale-95",
                      name === s ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-secondary/60 text-secondary-foreground hover:bg-secondary",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your accent color</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Shows on avatars, events, and little touches throughout.</p>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {ACCENT_SWATCHES.map((s) => (
                  <button
                    key={s.hex}
                    type="button"
                    aria-label={s.label}
                    aria-pressed={color === s.hex}
                    onClick={() => setColor(s.hex)}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "h-11 w-11 rounded-full transition-all duration-200 active:scale-90",
                        color === s.hex ? "scale-110 ring-[3px] ring-foreground/25 ring-offset-2 ring-offset-card" : "ring-1 ring-black/5 hover:scale-105",
                      )}
                      style={{ backgroundColor: s.hex }}
                    />
                    <span className={cn("text-[10px] font-medium leading-tight", color === s.hex ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </StationerySheet>

            <Button size="lg" className="mt-6 w-full" onClick={createSpace} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <BackLink onClick={() => setStep("type")} />
          </div>
        )}

        {step === "person" && (
          <div>
            <p className="text-overline text-hearth">Almost there</p>
            <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              {isCouple ? "Who's your person?" : "Invite your people"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {isCouple
                ? "Invite the one you want to keep days with. You'll share a calendar, plans, and the little things."
                : "Invite someone to share the calendar with — you can always add more people later."}
            </p>

            <StationerySheet className="mt-7">
              <label htmlFor="partner-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Their email
              </label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="partner-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="them@example.com"
                  maxLength={255}
                  autoFocus
                  className="h-12 rounded-2xl border-transparent bg-secondary/50 pl-11 pr-4 text-base shadow-inner focus-visible:ring-primary"
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                If they&apos;re new, they&apos;ll join automatically when they sign up with this email.
              </p>
            </StationerySheet>

            <Button size="lg" className="mt-6 w-full" onClick={() => sendInvite()} disabled={busy || !email.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send invite</>}
            </Button>
            <button type="button" onClick={() => sendInvite(true)} className="mt-4 w-full py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              I&apos;ll do this later
            </button>
          </div>
        )}

        {step === "dates" && (
          <div>
            <p className="text-overline text-hearth">One more thing</p>
            <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              Add a few dates<br />you already know
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Birthdays, an anniversary, a trip — so your calendar feels alive from day one.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {DATE_SUGGESTIONS[spaceType].map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => addRow(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-3 py-1.5 text-sm transition-all hover:bg-secondary active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> {s.title}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {rows.map((row, i) => (
                <StationerySheet key={i} className="!p-4">
                  <div className="flex items-center gap-2">
                    <CalendarHeart className="h-4 w-4 shrink-0 text-primary" />
                    <Input
                      value={row.title}
                      onChange={(e) => updateRow(i, { title: e.target.value })}
                      placeholder="What is it?"
                      maxLength={60}
                      className="h-10 flex-1 rounded-xl border-transparent bg-secondary/50"
                    />
                    <button type="button" onClick={() => removeRow(i)} aria-label="Remove" className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(i, { date: e.target.value })}
                      className="h-10 flex-1 rounded-xl border-transparent bg-secondary/50"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={row.yearly}
                        onChange={(e) => updateRow(i, { yearly: e.target.checked })}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      every year
                    </label>
                  </div>
                </StationerySheet>
              ))}

              <button
                type="button"
                onClick={() => addRow()}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-4 w-4" /> Add a date
              </button>
            </div>

            <Button size="lg" className="mt-6 w-full" onClick={() => saveDates()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <button type="button" onClick={() => saveDates(true)} className="mt-4 w-full py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Skip for now
            </button>
          </div>
        )}

        {step === "ready" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-6 inline-flex">
              <span className="absolute inset-0 animate-breathe rounded-full bg-primary/20" />
              <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-deep text-primary-foreground shadow-glow">
                <Heart className="h-9 w-9 fill-current" />
              </span>
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight">You&apos;re ready</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Your place is set. Plan the days ahead, look forward to what&apos;s next, and keep the moments worth remembering.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent/80 px-4 py-2 text-sm text-accent-foreground">
              <CalendarHeart className="h-4 w-4 text-primary" />
              Your shared calendar, and the little things
            </div>
            <Button size="lg" className="mt-8 w-full max-w-xs" onClick={finish}>
              Open Hearth
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-4 w-full py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
      Back
    </button>
  );
}

function ProgressDots({ count, current }: { count: number; current: number }) {
  return (
    <div className="mt-5 flex items-center gap-2" aria-label={`Step ${current + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i === current ? "w-8 bg-primary shadow-[0_0_12px_var(--color-primary)]" : i < current ? "w-3 bg-primary/50" : "w-3 bg-border",
          )}
        />
      ))}
    </div>
  );
}

function StationerySheet({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative rounded-[1.75rem] bg-card p-6 shadow-warm-lg", className)}>
      <div
        className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 rounded-sm bg-secondary/90 shadow-sm"
        aria-hidden
        style={{ transform: "translateX(-50%) rotate(-1.5deg)" }}
      />
      {children}
    </div>
  );
}
