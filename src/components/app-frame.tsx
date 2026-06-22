import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { UserAvatar, type ProfileLike } from "@/components/calendar/user-avatar";
import { QuickAddSheet } from "@/components/hearth";
import { useSpace } from "@/lib/use-space";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays, Heart, Home, LogOut, type LucideIcon,
  Moon, Plus, Sun, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Destination = { to: string; label: string; icon: LucideIcon; description: string };

export const DESTINATIONS: Destination[] = [
  { to: "/today", label: "Today", icon: Home, description: "Your dashboard" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, description: "Plan together" },
  { to: "/memories", label: "Memories", icon: Heart, description: "What you've kept" },
  { to: "/together", label: "Together", icon: Users, description: "Lists & goals" },
];

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("warm-theme", next ? "dark" : "light"); } catch { /* ignore */ }
    setDark(next);
  }
  return { dark, toggle };
}

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) => pathname === to || pathname.startsWith(`${to}/`);
}

export function ProfileMenu({ userId, align = "end" }: { userId: string; align?: "start" | "end" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { dark, toggle } = useTheme();

  const profileQ = useQuery({
    queryKey: ["me", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data as ProfileLike;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          {profileQ.data && <UserAvatar profile={profileQ.data} size="md" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium">{profileQ.data?.full_name || "Account"}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{profileQ.data?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggle(); }}>
          {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {dark ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut className="mr-2 h-4 w-4" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopSidebar({ userId }: { userId: string }) {
  const isActive = useActive();
  const { space } = useSpace(userId);

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link to="/today" aria-label="Hearth home">
          <Wordmark size="md" />
        </Link>
      </div>

      {space && (
        <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: space.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{space.name}</p>
            <p className="text-xs text-muted-foreground">Your space</p>
          </div>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main navigation">
        {DESTINATIONS.map(({ to, label, icon: Icon, description }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                active
                  ? "bg-hearth-muted text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <Icon
                className={cn("h-[18px] w-[18px] shrink-0", active && "text-hearth")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-none">{label}</span>
                <span className="mt-0.5 block text-[11px] leading-none opacity-70">{description}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <ProfileMenu userId={userId} align="start" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Your account</p>
            <p className="text-xs text-muted-foreground">Settings & sign out</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TabletRail({ userId }: { userId: string }) {
  const isActive = useActive();
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[72px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-5 md:flex lg:hidden">
      <Link to="/today" className="mb-6" aria-label="Hearth home">
        <Wordmark size="sm" withName={false} />
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-1" aria-label="Main">
        {DESTINATIONS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                active ? "bg-hearth-muted text-hearth" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
            </Link>
          );
        })}
      </nav>
      <ProfileMenu userId={userId} align="start" />
    </aside>
  );
}

function MobileNav({
  onQuickAdd,
}: {
  onQuickAdd: () => void;
}) {
  const isActive = useActive();
  const [left, right] = [DESTINATIONS.slice(0, 2), DESTINATIONS.slice(2)];

  function tab({ to, label, icon: Icon }: Destination) {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
          active ? "text-hearth" : "text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
        {label}
      </Link>
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-2">
        {left.map(tab)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label="Quick add"
            onClick={onQuickAdd}
            className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-warm transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        {right.map(tab)}
      </div>
    </nav>
  );
}

function MobileTopBar({
  userId,
  trailing,
}: {
  userId: string;
  trailing?: ReactNode;
}) {
  const { space } = useSpace(userId);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-lg md:hidden">
      <Link to="/today" aria-label="Hearth home">
        <Wordmark size="sm" withName={false} />
      </Link>
      {space && (
        <span className="truncate text-sm font-medium text-muted-foreground">{space.name}</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        {trailing}
        <ProfileMenu userId={userId} />
      </div>
    </header>
  );
}

export function AppFrame({
  userId,
  children,
  fullBleed = false,
  maxWidth = "reading",
  header,
  mobileTrailing,
  contentClassName,
  onQuickAddQuestion,
}: {
  userId: string;
  children: ReactNode;
  fullBleed?: boolean;
  maxWidth?: "reading" | "wide" | "full";
  header?: ReactNode;
  mobileTrailing?: ReactNode;
  contentClassName?: string;
  /** Called when user picks "Answer today's question" from quick-add */
  onQuickAddQuestion?: () => void;
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className={cn("flex bg-background", fullBleed ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]")}>
      <DesktopSidebar userId={userId} />
      <TabletRail userId={userId} />

      <div className={cn("flex min-w-0 flex-1 flex-col", fullBleed && "h-[100dvh]")}>
        {header ?? <MobileTopBar userId={userId} trailing={mobileTrailing} />}
        <main
          className={cn(
            fullBleed
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : cn(
                  "mx-auto w-full flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-8 md:pt-8 lg:px-8",
                  maxWidth === "full" && "max-w-none",
                  maxWidth === "wide" && "max-w-7xl",
                  maxWidth === "reading" && "max-w-3xl",
                  contentClassName,
                ),
          )}
        >
          {children}
        </main>
      </div>

      <MobileNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onAnswerQuestion={onQuickAddQuestion}
      />
    </div>
  );
}
