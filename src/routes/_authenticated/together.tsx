import { createFileRoute } from "@tanstack/react-router";
import { AppFrame } from "@/components/app-frame";
import { Panel, Overline, PageHeader } from "@/components/hearth";
import { ListChecks, Target, Sparkles, NotebookPen, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/together")({
  head: () => ({ meta: [{ title: "Together — Hearth" }] }),
  component: TogetherPage,
});

type Module = { icon: LucideIcon; title: string; desc: string; status: string };

const MODULES: Module[] = [
  { icon: ListChecks, title: "Shared lists", desc: "Groceries, packing, gift ideas — the little logistics in one place.", status: "Coming soon" },
  { icon: Sparkles, title: "Bucket list", desc: "Dream together, then turn any wish into a real plan on the calendar.", status: "Coming soon" },
  { icon: Target, title: "Goals & habits", desc: "Keep a streak together — walks, savings, anything you want to build.", status: "Coming soon" },
  { icon: NotebookPen, title: "Shared notes", desc: "Plans, ideas, and the running list of things you keep meaning to say.", status: "Coming soon" },
];

function TogetherPage() {
  const { user } = Route.useRouteContext();

  return (
    <AppFrame userId={user.id}>
      <PageHeader
        title="Together"
        description="The shared life around your calendar — lists, goals, and the things you're dreaming up."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.map(({ icon: Icon, title, desc, status }) => (
          <Panel key={title} raised className="p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-hearth-muted text-hearth">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2 className="text-title">{title}</h2>
            <p className="mt-1.5 text-caption leading-relaxed">{desc}</p>
            <Overline className="mt-4 inline-block rounded-md bg-muted px-2 py-1">{status}</Overline>
          </Panel>
        ))}
      </div>
    </AppFrame>
  );
}
