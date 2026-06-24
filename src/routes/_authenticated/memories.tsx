import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppFrame } from "@/components/app-frame";
import { Panel, Overline, PageHeader, EmptyState } from "@/components/hearth";
import { MomentReveal } from "@/components/amber";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useSpace } from "@/lib/use-space";
import type { Database } from "@/integrations/supabase/types";

type Moment = Database["public"]["Tables"]["moments"]["Row"];

export const Route = createFileRoute("/_authenticated/memories")({
  head: () => ({ meta: [{ title: "Memories — Hearth" }] }),
  component: MemoriesPage,
});

function MemoriesPage() {
  const { user } = Route.useRouteContext();
  const { space, profileById } = useSpace(user.id);

  const momentsQ = useQuery({
    queryKey: ["thread", space?.id],
    enabled: !!space,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moments")
        .select("*")
        .eq("calendar_id", space!.id)
        .order("happened_on", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Moment[];
    },
  });

  const groups = useMemo(() => {
    const m = new Map<string, Moment[]>();
    (momentsQ.data ?? []).forEach((mo) => {
      const arr = m.get(mo.happened_on) ?? [];
      arr.push(mo);
      m.set(mo.happened_on, arr);
    });
    return Array.from(m.entries());
  }, [momentsQ.data]);

  const count = momentsQ.data?.length ?? 0;

  return (
    <AppFrame userId={user.id}>
      <PageHeader
        title="Memories"
        description={count > 0 ? `${count} moment${count === 1 ? "" : "s"} kept together` : "Your shared timeline of reflections and moments"}
      />

      {momentsQ.isSuccess && groups.length === 0 && (
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title="Your story starts today"
          description="Answer today's question on the Today screen — every reflection you keep lands here."
          action={<Link to="/today"><Button>Go to Today</Button></Link>}
        />
      )}

      <div className="space-y-8">
        {groups.map(([day, items]) => (
          <DayGroup key={day} day={day} items={items} profileById={profileById} />
        ))}
      </div>
    </AppFrame>
  );
}

function DayGroup({
  day, items, profileById,
}: {
  day: string;
  items: Moment[];
  profileById: Record<string, import("@/components/calendar/user-avatar").ProfileLike>;
}) {
  const d = new Date(day + "T00:00:00");
  const label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <section>
      <Overline>{label}</Overline>
      <div className="mt-3 space-y-3">
        {items.map((m) => (
          <Panel key={m.id} className="p-4">
            <MomentReveal moment={m} who={profileById[m.created_by]} animate={false} />
          </Panel>
        ))}
      </div>
    </section>
  );
}
