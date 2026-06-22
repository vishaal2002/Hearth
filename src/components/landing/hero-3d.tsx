import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

const TILT_SPRING = { stiffness: 220, damping: 28, mass: 0.45 };

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function LandingHero3D({ className }: { className?: string }) {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, TILT_SPRING);
  const sy = useSpring(py, TILT_SPRING);
  const rotateX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-6, 6]);

  function onMove(e: React.MouseEvent) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function onLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      ref={ref}
      className={cn("relative mx-auto w-full max-w-[340px] px-6 sm:px-8", className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Soft glow behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-full bg-hearth/10 blur-3xl"
      />

      {/* Perspective lives on this wrapper — never on the rotating element */}
      <div className="relative" style={{ perspective: 1000 }}>
        {/* 2D depth stack (no 3D — avoids overlap bugs) */}
        <div
          aria-hidden
          className="absolute inset-x-3 top-3 bottom-0 rounded-2xl border border-border/40 bg-muted/60"
          style={{ transform: "translateY(14px) scale(0.94)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-1.5 top-1.5 bottom-0 rounded-2xl border border-border/50 bg-card/80 shadow-sm"
          style={{ transform: "translateY(7px) scale(0.97)" }}
        />

        {/* Front card — sole 3D element */}
        <motion.div
          className="relative z-10"
          style={
            mounted && !reduced
              ? { rotateX, rotateY, transformStyle: "preserve-3d" }
              : undefined
          }
        >
          <div className="hearth-panel-raised overflow-hidden rounded-2xl p-1 shadow-warm-lg">
            <HeroPreview />
          </div>
        </motion.div>
      </div>

      {/* Side badges — flat 2D, positioned outside the card bounds */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-2 top-[18%] z-20 max-w-[130px] rounded-lg border border-border bg-card px-2.5 py-2 shadow-warm sm:-right-6"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-hearth">Countdown</p>
        <p className="text-lg font-semibold leading-tight">24 days</p>
        <p className="text-[10px] text-muted-foreground">Anniversary trip</p>
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-2 bottom-[22%] z-20 max-w-[130px] rounded-lg border border-border bg-card px-2.5 py-2 shadow-warm sm:-left-6"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <p className="text-[10px] font-medium text-muted-foreground">Mom shared today</p>
        <p className="mt-0.5 text-xs leading-snug">&ldquo;What made you smile?&rdquo;</p>
      </motion.div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="rounded-[14px] bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <Wordmark size="sm" />
        <span className="rounded-full bg-hearth-muted px-2 py-0.5 text-[10px] font-medium text-hearth">
          Today
        </span>
      </div>
      <p className="text-base font-semibold">Good evening, Sam</p>
      <p className="text-caption">Monday, June 23</p>
      <div className="mt-3 grid gap-2.5">
        <div className="hearth-panel p-2.5">
          <p className="text-overline">Next up</p>
          <p className="mt-0.5 text-sm font-medium">Dinner with Mom</p>
          <p className="text-caption">7:00 PM · tonight</p>
        </div>
        <div className="hearth-panel p-2.5">
          <p className="text-overline">Looking forward to</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight">24 days</p>
          <p className="text-sm font-medium">Anniversary trip</p>
        </div>
        <div className="hearth-panel p-2.5">
          <p className="text-overline">Today&apos;s question</p>
          <p className="mt-1 text-sm font-medium leading-snug">What made you smile today?</p>
        </div>
      </div>
    </div>
  );
}

export function FeatureCard3D({
  icon,
  title,
  desc,
  className,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn("hearth-panel-raised p-6", className)}
      whileHover={reduced ? undefined : { y: -3, transition: { duration: 0.2 } }}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-hearth-muted text-hearth">
        {icon}
      </div>
      <h3 className="text-title">{title}</h3>
      <p className="mt-1.5 text-caption leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export function ScrollReveal3D({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
