import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  children,
  className,
  raised,
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <section className={cn(raised ? "hearth-panel-raised" : "hearth-panel", className)}>
      {children}
    </section>
  );
}

export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-overline", className)}>{children}</p>;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h1 className="text-display font-display text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-caption">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-hearth-muted text-hearth">
          {icon}
        </div>
      )}
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-caption leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
