import { UserAvatar, type ProfileLike } from "@/components/calendar/user-avatar";
import { cn } from "@/lib/utils";
import { Whisper } from "./typography";

export function PartnerPresence({
  you,
  partner,
  partnerSharedToday,
  className,
}: {
  you?: ProfileLike;
  partner?: ProfileLike | null;
  partnerSharedToday?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {you && <UserAvatar profile={you} size="sm" ring />}
      <div className="flex -space-x-2">
        {partner ? (
          <span className="relative">
            <UserAvatar profile={partner} size="sm" ring className="ring-2 ring-background" />
            {partnerSharedToday && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
                aria-label="Shared today"
              />
            )}
          </span>
        ) : (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-secondary/50 text-[10px] text-muted-foreground"
            aria-label="Waiting for your person"
          >
            ?
          </span>
        )}
      </div>
    </div>
  );
}

export function PartnerHeader({
  partner,
  children,
}: {
  partner?: ProfileLike | null;
  children?: React.ReactNode;
}) {
  const name = partner?.full_name?.split(" ")[0] || "them";
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <Whisper>from {name}</Whisper>
      {children}
    </div>
  );
}
