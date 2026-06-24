import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Hearth" }] }),
  validateSearch: (search: Record<string, unknown>): { unconfirmed?: boolean } => ({
    unconfirmed: search.unconfirmed === true || search.unconfirmed === "true",
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Required").max(80);

function AuthPage() {
  const navigate = useNavigate();
  const { unconfirmed } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today" });
    });
  }, [navigate]);

  useEffect(() => {
    if (unconfirmed) {
      toast.error("Please confirm your email first — check your inbox for the link.");
    }
  }, [unconfirmed]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    const ep = emailSchema.safeParse(email);
    const pp = passwordSchema.safeParse(password);
    if (!ep.success) return toast.error(ep.error.issues[0].message);
    if (!pp.success) return toast.error(pp.error.issues[0].message);
    if (mode === "signup") {
      const np = nameSchema.safeParse(fullName);
      if (!np.success) return toast.error(np.error.issues[0].message);
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/today`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        // Supabase hides "email already registered" to prevent enumeration by
        // returning a user with no identities and no session. Treat that as a
        // sign-in prompt instead of a misleading success.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("That email already has an account. Try signing in.");
          setMode("signin");
          return;
        }
        if (data.session) {
          // Email confirmation is disabled — the user is already signed in.
          navigate({ to: "/today" });
        } else {
          // Confirmation required: no session yet. Don't route into the app (the
          // auth guard would bounce them straight back here). Wait for the link.
          toast.success("Almost there — check your email to confirm your account.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/today" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setOauthLoading(true);
    // Go straight through Supabase's Google provider. (The previous Lovable OAuth
    // broker hits /~oauth/initiate, which only exists on Lovable Cloud hosting and
    // 404s everywhere else.) On success the browser redirects to Google and back to
    // /today, where Supabase picks up the session from the callback URL.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/today` },
    });
    if (error) {
      toast.error(error.message || "Google sign-in failed");
      setOauthLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link to="/"><Wordmark size="lg" className="[&_span:last-child]:text-primary-foreground" /></Link>
        <div>
          <blockquote className="text-2xl font-semibold leading-snug tracking-tight">
            &ldquo;The calendar we actually use together.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm opacity-70">
            Plan ahead, count down to what matters, and keep the moments worth remembering.
          </p>
        </div>
        <p className="text-xs opacity-50">Private · No ads · Your people only</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-5 py-12">
        <Link to="/" className="mb-8 lg:hidden"><Wordmark size="lg" /></Link>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-caption">
            {mode === "signin"
              ? "Sign in to your shared space"
              : "Start planning together in under a minute"}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-8 w-full h-11"
            onClick={handleGoogle}
            disabled={oauthLoading || loading}
          >
            {oauthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            <span className="ml-2">Continue with Google</span>
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-overline">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jordan Rivera" autoComplete="name" maxLength={80} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={255} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} maxLength={72} required />
            </div>
            <Button type="submit" className="w-full h-11 mt-2" disabled={loading || oauthLoading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-caption">
            {mode === "signin" ? "New to Hearth?" : "Already have an account?"}{" "}
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}
