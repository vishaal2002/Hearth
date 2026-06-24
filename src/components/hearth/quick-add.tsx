import { Link } from "@tanstack/react-router";
import { CalendarPlus, MessageCircle, PenLine } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type QuickAddProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnswerQuestion?: () => void;
};

const ACTIONS = [
  {
    key: "event",
    label: "New event",
    description: "Plan something on the calendar",
    icon: CalendarPlus,
    to: "/calendar" as const,
  },
  {
    key: "question",
    label: "Answer today's question",
    description: "Share a reflection with your people",
    icon: PenLine,
    action: "question" as const,
  },
  {
    key: "memories",
    label: "Browse memories",
    description: "Revisit what you've kept together",
    icon: MessageCircle,
    to: "/memories" as const,
  },
];

export function QuickAddSheet({ open, onOpenChange, onAnswerQuestion }: QuickAddProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-semibold">Create</DrawerTitle>
          <DrawerDescription>What would you like to add?</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-2 px-4 pb-6">
          {ACTIONS.map(({ key, label, description, icon: Icon, ...rest }) => {
            const inner = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-caption">{description}</span>
                </span>
              </>
            );
            const cls =
              "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent active:scale-[0.99]";

            if ("to" in rest && rest.to) {
              return (
                <Link
                  key={key}
                  to={rest.to}
                  className={cls}
                  onClick={() => onOpenChange(false)}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={key}
                type="button"
                className={cls}
                onClick={() => {
                  onOpenChange(false);
                  onAnswerQuestion?.();
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
