import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hasSharedSpace } from "@/lib/space";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

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
