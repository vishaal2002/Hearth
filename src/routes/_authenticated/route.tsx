import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hasSharedSpace } from "@/lib/space";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Block access until the email is actually confirmed. Without this, a stale
    // session or a signup made while confirmation was disabled would let an
    // unverified account into the app. OAuth users (e.g. Google) are confirmed
    // automatically, so this only gates unconfirmed email/password signups.
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { unconfirmed: true } });
    }

    const onWelcome = location.pathname === "/welcome" || location.pathname.startsWith("/welcome/");

    try {
      const onboarded = await hasSharedSpace();
      if (!onboarded && !onWelcome) throw redirect({ to: "/welcome" });
      if (onboarded && onWelcome) throw redirect({ to: "/today" });
    } catch (err) {
      // Don't block the app on a transient calendars fetch failure — welcome can still render.
      if (!onWelcome) throw err;
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
