import { createFileRoute } from "@tanstack/react-router";
import { Layers, Lock, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/kit";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLevels, useProgress, useStudents } from "@/hooks/use-data";
import { LEVELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/levels")({
  head: () => ({
    meta: [
      { title: "Levels — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "CEFR levels from Pre-A1 to C2, student distribution and each student's level journey.",
      },
      { property: "og:title", content: "Levels — EasySpeak Teacher Management" },
      { property: "og:description", content: "Explore CEFR levels and student progression." },
    ],
  }),
  component: LevelsPage,
});

function LevelCard({
  code,
  name,
  description,
  count,
  state,
  progress,
}: {
  code: string;
  name: string;
  description?: string | null;
  count: number;
  state: "completed" | "current" | "target" | "locked";
  progress: number;
}) {
  const isCompleted = state === "completed";
  const isCurrent = state === "current";
  const isTarget = state === "target";

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isCurrent
          ? "border-secondary bg-accent/10"
          : isTarget
            ? "border-border bg-card"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${
              isCompleted
                ? "bg-success/12 text-success"
                : isCurrent
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {isTarget ? <Target className="size-5" /> : <Layers className="size-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold">
              {code}
              <span className="ml-2 text-sm font-normal text-muted-foreground">{name}</span>
            </p>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{count} students</span>
          {state === "completed" && (
            <span className="text-xs font-medium text-success">Completed</span>
          )}
          {state === "current" && (
            <span className="text-xs font-medium text-secondary">Current</span>
          )}
          {state === "target" && (
            <span className="text-xs font-medium text-muted-foreground">Target</span>
          )}
        </div>
      </div>
      {state === "current" && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress toward next level</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <ProgressBar className="mt-1.5" value={progress} tone="accent" />
        </div>
      )}
      {state === "target" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Reachable once the current level is completed.
        </p>
      )}
    </div>
  );
}

function LevelsPage() {
  const levels = useLevels();
  const students = useStudents();
  const progress = useProgress();

  const active = useMemo(
    () => (students.data ?? []).filter((s) => s.status === "Active"),
    [students.data],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  useEffect(() => {
    if (!selectedId && active.length) setSelectedId(active[0]!.id);
  }, [active, selectedId]);

  const selected = active.find((s) => s.id === selectedId) ?? active[0];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of active) c[s.current_level] = (c[s.current_level] ?? 0) + 1;
    return c;
  }, [active]);

  const levelData = useMemo(() => {
    const rows = (levels.data ?? []).length
      ? [...(levels.data ?? [])].sort((a, b) => a.order_number - b.order_number)
      : LEVELS.map((code, i) => ({
          id: code,
          code,
          name: code,
          description: null,
          order_number: i + 1,
        }));
    const idx = new Map(rows.map((r, i) => [r.code, i]));
    const selectedIndex = selected ? (idx.get(selected.current_level) ?? 0) : -1;
    return {
      rows,
      selectedIndex,
      selectedProgress:
        (progress.data ?? []).find((p) => p.student_id === selected?.id)?.overall_progress ?? 0,
    };
  }, [levels.data, selected, progress.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Levels"
        description="The CEFR level framework from Pre-A1 to C2, and where each student stands."
        actions={
          <Select value={selected?.id ?? ""} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {active.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Levels"
          value={LEVELS.length}
          hint="Pre-A1 → C2"
          icon={<Layers className="size-5" />}
        />
        <StatCard
          label="Active Students"
          value={active.length}
          hint="Currently enrolled"
          icon={<Target className="size-5" />}
        />
        <StatCard
          label="Most Common Level"
          value={Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}
          hint="Across active students"
          tone="accent"
          icon={<Layers className="size-5" />}
        />
        <StatCard
          label="Selected Level"
          value={selected?.current_level ?? "—"}
          hint={selected ? `${selected.name}` : "No student selected"}
          tone="secondary"
          icon={<Target className="size-5" />}
        />
      </div>

      {!selected ? (
        <EmptyState
          title="No active students."
          description="Add a student to see their level journey."
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="space-y-3 p-5">
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="font-medium text-foreground">{selected.name}</p>
              <p className="mt-1 text-muted-foreground">
                Current level: <span className="font-semibold">{selected.current_level}</span> •
                Target: <span className="font-semibold">{selected.target_level}</span> • Enrolled{" "}
                {selected.enrollment_date}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall progress</span>
                <span className="font-medium text-foreground">{levelData.selectedProgress}%</span>
              </div>
              <ProgressBar className="mt-1.5" value={levelData.selectedProgress} />
            </div>
            <div className="space-y-3">
              {levelData.rows.map((row, i) => {
                let state: "completed" | "current" | "target" | "locked" = "locked";
                if (i < levelData.selectedIndex) state = "completed";
                else if (i === levelData.selectedIndex) state = "current";
                else if (row.code === selected.target_level) state = "target";
                return (
                  <LevelCard
                    key={row.id}
                    code={row.code}
                    name={row.name}
                    description={row.description}
                    count={counts[row.code] ?? 0}
                    state={state}
                    progress={levelData.selectedProgress}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
