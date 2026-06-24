import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileLike } from "@/components/calendar/user-avatar";
import type { Database } from "@/integrations/supabase/types";

export type Space = Database["public"]["Tables"]["calendars"]["Row"];

/**
 * The shared world for the signed-in person: the (non-personal) Space calendar
 * plus everyone in it. Generalizes the old single-"partner" assumption — a Space
 * can hold two people (a couple) or many (a family / friend group).
 */
export function useSpace(userId: string) {
  const spaceQ = useQuery({
    queryKey: ["space", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendars")
        .select("*")
        .order("is_personal", { ascending: true });
      if (error) throw error;
      return (data.find((c) => !c.is_personal) ?? data[0] ?? null) as Space | null;
    },
  });
  const space = spaceQ.data ?? null;

  const peopleQ = useQuery({
    queryKey: ["space-people", space?.id],
    enabled: !!space,
    queryFn: async () => {
      const { data: mem } = await supabase
        .from("calendar_members")
        .select("user_id")
        .eq("calendar_id", space!.id);
      const ids = (mem ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [] as ProfileLike[];
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      return (profs ?? []) as ProfileLike[];
    },
  });

  const members = useMemo(() => peopleQ.data ?? [], [peopleQ.data]);
  const me = useMemo(() => members.find((p) => p.id === userId), [members, userId]);
  const others = useMemo(() => members.filter((p) => p.id !== userId), [members, userId]);
  const profileById = useMemo(() => {
    const m: Record<string, ProfileLike> = {};
    members.forEach((p) => { m[p.id] = p; });
    return m;
  }, [members]);

  return { space, spaceQ, peopleQ, members, me, others, profileById };
}
