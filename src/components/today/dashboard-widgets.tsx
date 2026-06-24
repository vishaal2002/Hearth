import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export function DashboardStagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function DashboardItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function TimeOfDayBanner({ hour }: { hour: number }) {
  const isMorning = hour < 12;
  const isAfternoon = hour >= 12 && hour < 18;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 -top-8 h-32 opacity-60 blur-2xl",
        isMorning && "bg-gradient-to-r from-amber-200/40 via-orange-100/30 to-transparent",
        isAfternoon && "bg-gradient-to-r from-sky-200/35 via-hearth/15 to-transparent",
        !isMorning && !isAfternoon && "bg-gradient-to-r from-indigo-300/25 via-violet-200/20 to-transparent",
      )}
      aria-hidden
    />
  );
}

export function CountdownRing({
  days,
  maxDays = 30,
  color = "oklch(0.55 0.13 32)",
}: {
  days: number;
  maxDays?: number;
  color?: string;
}) {
  const reduced = useReducedMotion();
  const r = 36;
  const c = 2 * Math.PI * r;
  const progress = Math.min(days / maxDays, 1);
  const offset = c * (1 - progress);

  return (
    <div className="relative inline-flex h-[88px] w-[88px] items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
        <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/80" />
        <motion.circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? { strokeDashoffset: offset } : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-2xl font-semibold tabular-nums tracking-tight">{days}</span>
    </div>
  );
}

export function ActionChip({
  label,
  to,
  search,
  onClick,
  variant = "default",
}: {
  label: string;
  to?: "/calendar";
  search?: { new: string; title?: string };
  onClick?: () => void;
  variant?: "default" | "hearth";
}) {
  const cls = cn(
    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
    "hover:scale-[1.03] active:scale-[0.98]",
    variant === "hearth"
      ? "border-hearth/30 bg-hearth-muted text-hearth hover:bg-hearth/15"
      : "border-border bg-background hover:border-hearth/25 hover:bg-accent",
  );

  if (to) {
    return (
      <Link to={to} search={search} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label}
    </button>
  );
}

/** Empty today — add something for *today* or check in */
export function TodayEmptyActions({ onCheckIn }: { onCheckIn: () => void }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-caption">A calm day — fill it or just check in.</p>
      <div className="flex flex-wrap gap-2">
        <ActionChip label="Dinner tonight" to="/calendar" search={{ new: "today", title: "Dinner" }} />
        <ActionChip label="Add to today" to="/calendar" search={{ new: "today" }} variant="hearth" />
        <ActionChip label="Share how you feel" onClick={onCheckIn} />
      </div>
    </div>
  );
}

/** Empty countdown — plan something *ahead* */
export function AheadEmptyActions() {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-caption">Give yourselves something to look forward to.</p>
      <div className="flex flex-wrap gap-2">
        <ActionChip label="Plan a trip" to="/calendar" search={{ new: "ahead", title: "Trip" }} />
        <ActionChip label="Anniversary" to="/calendar" search={{ new: "ahead", title: "Anniversary" }} />
        <ActionChip label="Birthday" to="/calendar" search={{ new: "ahead", title: "Birthday" }} variant="hearth" />
      </div>
    </div>
  );
}

/** Both empty — one unified quiet-day card */
export function QuietDayCard({ onCheckIn }: { onCheckIn: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-hearth/25 bg-hearth-muted/30 p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-hearth/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-hearth">
            <Sparkles className="h-3 w-3" /> Quiet day
          </div>
          <p className="text-title">Nothing planned yet</p>
          <p className="mt-1 max-w-md text-caption">
            Add something for today, plan ahead, or share a moment with your people.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <ActionChip label="Add to today" to="/calendar" search={{ new: "today" }} variant="hearth" />
          <ActionChip label="Plan ahead" to="/calendar" search={{ new: "ahead" }} />
          <button
            type="button"
            onClick={onCheckIn}
            className="text-xs font-medium text-hearth underline-offset-2 hover:underline"
          >
            Answer today&apos;s question instead
          </button>
        </div>
      </div>
    </div>
  );
}

export function WeekStrip({
  days,
}: {
  days: { date: Date; has: boolean; isToday: boolean }[];
}) {
  const reduced = useReducedMotion();
  return (
    <div className="mt-4 grid grid-cols-7 gap-1 text-center">
      {days.map(({ date, has, isToday }, i) => (
        <motion.div
          key={date.toISOString()}
          className="flex flex-col items-center gap-1.5"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.35 }}
        >
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {date.toLocaleDateString([], { weekday: "narrow" })}
          </span>
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-transform",
              isToday
                ? "bg-primary font-semibold text-primary-foreground shadow-glow scale-105"
                : "text-foreground hover:bg-accent",
            )}
          >
            {date.getDate()}
          </span>
          <span className="flex h-1.5 w-1.5 items-center justify-center">
            {has ? (
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-hearth"
                initial={reduced ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 400 }}
              />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
            )}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function EventRowVisual({
  time,
  title,
  color,
  to = "/calendar",
}: {
  time: string;
  title: string;
  color: string;
  to?: string;
}) {
  return (
    <motion.li
      whileHover={{ x: 3 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-accent/60"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background" style={{ backgroundColor: color }} />
        <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">{time}</span>
        <span className="flex-1 truncate text-sm font-medium">{title}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </motion.li>
  );
}
