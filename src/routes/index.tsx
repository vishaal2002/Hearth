import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { FeatureCard3D, LandingHero3D, ScrollReveal3D } from "@/components/landing";
import {
  ArrowRight, CalendarDays, CalendarHeart, Heart, Lock, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearth — the shared calendar for people you love" },
      { name: "description", content: "Plan your days together, look forward to what's next, and keep the moments worth remembering." },
      { property: "og:title", content: "Hearth — the shared calendar for people you love" },
      { property: "og:description", content: "Plan together. Remember together. A private shared calendar for couples, families, and close friends." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/"><Wordmark size="md" /></Link>
          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Button onClick={() => navigate({ to: "/today" })}>
                Open Hearth <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
                <Button onClick={() => navigate({ to: "/auth" })}>Get started</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-visible">
          <div className="pointer-events-none absolute inset-0 hearth-gradient" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
            <div className="animate-hearth-enter">
              <p className="text-overline text-hearth">Shared calendar · Private by design</p>
              <h1 className="mt-4 text-display-xl text-foreground">
                Life together,<br />beautifully organized
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                Hearth is where couples, families, and close friends plan ahead, count down to what matters, and keep the moments worth remembering — all in one warm, private place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="h-11 px-6" onClick={() => navigate({ to: signedIn ? "/today" : "/auth" })}>
                  {signedIn ? "Open your Hearth" : "Start free"}
                </Button>
                <Button size="lg" variant="outline" className="h-11 px-6" onClick={() => navigate({ to: "/auth" })}>
                  Sign in
                </Button>
              </div>
              <p className="mt-4 text-caption">No ads. No feed. Just the people you choose.</p>
            </div>

            <div className="animate-hearth-enter flex justify-center lg:justify-end" style={{ animationDelay: "0.1s" }}>
              <LandingHero3D />
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <ScrollReveal3D className="mb-12 max-w-2xl">
            <p className="text-overline">Why Hearth</p>
            <h2 className="mt-2 text-display text-foreground">
              A calendar that cares about connection
            </h2>
            <p className="mt-3 text-caption leading-relaxed">
              Most calendars track tasks. Hearth tracks the life you&apos;re building with the people who matter most.
            </p>
          </ScrollReveal3D>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard3D
              icon={<CalendarDays className="h-5 w-5" />}
              title="One calendar, together"
              desc="Birthdays, trips, date nights — everyone sees what's coming and adds to it."
              className="lg:col-span-2"
            />
            <FeatureCard3D
              icon={<Sparkles className="h-5 w-5" />}
              title="Countdown to joy"
              desc="Every trip and anniversary gets a countdown, so anticipation is shared."
            />
            <FeatureCard3D
              icon={<Heart className="h-5 w-5" />}
              title="Moments worth keeping"
              desc="Daily reflections become a timeline of your life together."
            />
            <FeatureCard3D
              icon={<CalendarHeart className="h-5 w-5" />}
              title="This day, last year"
              desc="Hearth quietly resurfaces what you were doing a year ago today."
              className="lg:col-span-2"
            />
            <FeatureCard3D
              icon={<Lock className="h-5 w-5" />}
              title="Truly private"
              desc="Your space, your people. Protected at the database level — no followers, no ads."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-muted/40">
          <ScrollReveal3D className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
            <h2 className="text-display text-foreground">Ready to plan together?</h2>
            <p className="mx-auto mt-3 max-w-md text-caption">
              Create your shared space in under a minute. Invite your people when you&apos;re ready.
            </p>
            <Button size="lg" className="mt-8 h-11 px-8" onClick={() => navigate({ to: signedIn ? "/today" : "/auth" })}>
              {signedIn ? "Go to Today" : "Create your Hearth"}
            </Button>
          </ScrollReveal3D>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-caption">
        Hearth — made for people who care
      </footer>
    </div>
  );
}
