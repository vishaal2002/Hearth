import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

export type Space = Database["public"]["Tables"]["calendars"]["Row"];

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

/** Pull a human-readable message from Supabase/PostgREST errors. */
export function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** The couple's shared space — a non-personal calendar, if one exists. */
export async function getSharedSpace(): Promise<Space | null> {
  const { data, error } = await supabase
    .from("calendars")
    .select("*")
    .order("is_personal", { ascending: true });
  if (error) throw error;
  return data.find((c) => !c.is_personal) ?? null;
}

export async function hasSharedSpace(): Promise<boolean> {
  return (await getSharedSpace()) !== null;
}

/** Create the couple's shared space + set accent color. Returns the space id. */
export async function createSharedSpace(userId: string, name: string, color: string): Promise<string> {
  const existing = await getSharedSpace();
  if (existing) return existing.id;

  // Prefer the security-definer RPC when the migration has been applied.
  const { data: rpcId, error: rpcErr } = await supabase.rpc("create_shared_space", {
    p_name: name,
    p_color: color,
  });
  if (!rpcErr && rpcId) return rpcId as string;

  const rpcMissing =
    rpcErr?.code === "PGRST202" ||
    (rpcErr?.message?.includes("create_shared_space") ?? false);

  // Client fallback: insert without RETURNING (RLS blocks .select() on insert).
  const { error: profileErr } = await supabase.from("profiles").update({ color }).eq("id", userId);
  if (profileErr) throw profileErr;

  const { error: calErr } = await supabase.from("calendars").insert({
    name,
    color,
    owner_id: userId,
    is_personal: false,
  });
  if (calErr) throw calErr;

  // on_calendar_created trigger should add owner membership; then the space is visible.
  const space = await getSharedSpace();
  if (space) return space.id;

  if (rpcErr && !rpcMissing) throw rpcErr;
  throw new Error(
    rpcMissing
      ? "Couldn't finish setup — run the latest Supabase migrations (create_shared_space), then try again."
      : "Place was created but couldn't be loaded — refresh and try again.",
  );
}

/** Add a partner by email — existing user joins immediately; new users auto-accept on signup. */
export async function invitePartner(calendarId: string, rawEmail: string) {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("calendar_members")
      .insert({ calendar_id: calendarId, user_id: existing.id, role: "editor" });
    if (error && !error.message.includes("duplicate")) throw error;
    return { kind: "added" as const };
  }

  const { error } = await supabase.from("invitations").insert({
    calendar_id: calendarId,
    invited_email: parsed.data,
    role: "editor",
    invited_by: userData.user.id,
  });
  if (error) throw error;
  return { kind: "invited" as const };
}
