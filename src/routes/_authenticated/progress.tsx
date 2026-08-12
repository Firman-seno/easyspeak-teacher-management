import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarCheck, CheckCircle2, Flame, Save, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAssignments, useAttendance, useLessons, useProgress, useProjects, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import {
  SKILLS,
  formatDate,
  overallProgress,
  projectStats,
  summarizeAttendance,
  todayISO,
} from "@/lib/domain";
import type { Skill } from "@/lib/domain";
import type { TablesUpdate } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Learning Progress — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Overall progress, lessons completed, projects and attendance for every student.",
      },
      { property: "og:title", content: "Learning Progress — EasySpeak Teacher Management" },
      { property: "og:description", content: "Track student learning progress and skills." },
    ],
  }),
  component: ProgressPage,
});

function learningStreak(records: { date: string; status: string }[]): number {
  const ok = new Set(
    records.filter((r) => r.status === "Present" || r.status === "Late").map((r) => r.date),
  );
  let streak = 0;
  const cursor = new Date(todayISO());
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!ok.has(iso)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function ProgressPage() {
  const qc = useQueryClient();
  const students = useStudents();
  const attendance = useAttendance();
  const lessons = useLessons();
  const assignments = useAssignments();
  const projects = useProjects();
  const progress = useProgress();

  const active = useMemo(
    () => (students.data ?? []).filter((s) => s.status === "Active"),
    [students.data],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  useEffect(() => {
    if (!selectedId && active.length) setSelectedId(active[0]!.id);
  }, [active, selectedId]);

  const [skills, setSkills] = useState<Record<Skill, string>>({
    speaking: "",
    listening: "",
    reading: "",
    writing: "",
    vocabulary: "",
    grammar: "",
  });
  const [notes, setNotes] = useState("");

  const selected = active.find((s) => s.id === selectedId) ?? active[0];
  const selectedProgress = useMemo(
    () => (progress.data ?? []).find((p) => p.student_id === selected?.id),
    [progress.data, selected],
  );

  useEffect(() => {
    if (!selectedProgress) return;
    setSkills({
      speaking: String(selectedProgress.speaking),
      listening: String(selectedProgress.listening),
      reading: String(selectedProgress.reading),
      writing: String(selectedProgress.writing),
      vocabulary: String(selectedProgress.vocabulary),
      grammar: String(selectedProgress.grammar),
    });
    setNotes(selectedProgress.teacher_notes ?? "");
  }, [selectedProgress]);

  const data = useMemo(() => {
    const allStudents = students.data ?? [];
    const attRecords = attendance.data ?? [];
    const lessonsList = lessons.data ?? [];
    const assign = assignments.data ?? [];
    const proj = projects.data ?? [];
    const prog = progress.data ?? [];

    const rates = allStudents.map(
      (s) => summarizeAttendance(attRecords.filter((r) => r.student_id === s.id)).rate,
    );
    const avgAttendance = rates.length
      ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
      : 0;

    const lessonsDone = lessonsList.filter((l) => l.status === "Completed").length;
    const assignmentsDone = assign.filter((a) => a.status === "Completed").length;
    const projStats = projectStats(proj);

    return {
      avgProgress: prog.length
        ? Math.round(prog.reduce((a, p) => a + p.overall_progress, 0) / prog.length)
        : 0,
      lessonsDone,
      lessonsTotal: lessonsList.length,
      assignmentsDone,
      assignmentsTotal: assign.length,
      projectsCompleted: projStats.completed,
      projectsTotal: projStats.total,
      avgAttendance,
    };
  }, [students.data, attendance.data, lessons.data, assignments.data, projects.data, progress.data]);

  const selectedData = useMemo(() => {
    if (!selected) return null;
    const att = summarizeAttendance(
      (attendance.data ?? []).filter((r) => r.student_id === selected.id),
    );
    const relevant = (lessons.data ?? []).filter((l) => l.student_id === selected.id);
    const relevantDone = relevant.filter((l) => l.status === "Completed").length;
    const assign = (assignments.data ?? []).filter((a) => a.student_id === selected.id);
    const assignDone = assign.filter((a) => a.status === "Completed").length;
    const proj = (projects.data ?? []).filter((p) => p.student_id === selected.id);
    const stats = projectStats(proj);
    return {
      att,
      streak: learningStreak((attendance.data ?? []).filter((r) => r.student_id === selected.id)),
      relevantDone,
      relevantTotal: relevant.length,
      assignDone,
      assignTotal: assign.length,
      stats,
      prog: (progress.data ?? []).find((p) => p.student_id === selected.id),
    };
  }, [selected, attendance.data, lessons.data, assignments.data, projects.data, progress.data]);

  const save = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No student selected");
      const parsed = Object.fromEntries(
        Object.entries(skills).map(([k, v]) => [
          k,
          v === "" ? 0 : Math.min(100, Math.max(0, Number(v))),
        ]),
      ) as Record<Skill, number>;
      const values: TablesUpdate<"progress"> = {
        ...parsed,
        overall_progress: overallProgress(parsed),
        teacher_notes: notes.trim() || null,
      };
      return api.saveProgress(selected.id, values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.progress });
      toast.success("Progress successfully saved.");
    },
    onError: () => toast.error("Something went wrong."),
  });

  const sp = selectedData?.prog;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Progress"
        description="Review each student's progress across skills, lessons, projects and attendance."
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Average Progress"
          value={`${data.avgProgress}%`}
          hint="All active students"
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          label="Lessons Completed"
          value={`${data.lessonsDone} / ${data.lessonsTotal}`}
          hint="Materials marked completed"
          tone="success"
          icon={<BookOpen className="size-5" />}
        />
        <StatCard
          label="Assignments Completed"
          value={`${data.assignmentsDone} / ${data.assignmentsTotal}`}
          hint="Across all students"
          icon={<CheckCircle2 className="size-5" />}
        />
        <StatCard
          label="Projects Completed"
          value={`${data.projectsCompleted} / ${data.projectsTotal}`}
          hint="Across all students"
          tone="accent"
          icon={<CheckCircle2 className="size-5" />}
        />
        <StatCard
          label="Avg Attendance"
          value={`${data.avgAttendance}%`}
          hint="Present or late"
          icon={<CalendarCheck className="size-5" />}
        />
      </div>

      {!selected ? (
        <EmptyState
          title="No active students."
          description="Add a student to start tracking progress."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-soft lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Skill progress — {selected.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall progress</span>
                    <span className="text-lg font-semibold">{sp?.overall_progress ?? 0}%</span>
                  </div>
                  <ProgressBar className="mt-2 h-3" value={sp?.overall_progress ?? 0} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SKILLS.map((skill) => (
                    <div key={skill} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm capitalize">{skill}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={skills[skill]}
                            onChange={(e) => setSkills((s) => ({ ...s, [skill]: e.target.value }))}
                            className="h-8 w-20 text-right"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                      <ProgressBar value={Number(skills[skill] || 0)} tone="accent" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-notes">Teacher notes</Label>
                  <Textarea
                    id="teacher-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional note about this student's progress…"
                    rows={3}
                  />
                </div>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  <Save className="size-4" /> Save progress
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current level</span>
                    <span className="font-semibold">{selected.current_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target level</span>
                    <span className="font-semibold">{selected.target_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendance rate</span>
                    <span className="font-semibold">{selectedData?.att.rate ?? 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meetings</span>
                    <span className="font-semibold">{selectedData?.att.total ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Flame className="size-4 text-warning" /> Learning streak
                    </span>
                    <span className="font-semibold">{selectedData?.streak ?? 0} days</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">Completion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Lessons Progress</span>
                      <span className="font-medium">
                        {selectedData?.relevantDone ?? 0} / {selectedData?.relevantTotal ?? 0}{" "}
                        Completed
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-1.5"
                      value={
                        selectedData?.relevantTotal
                          ? Math.round(
                              ((selectedData.relevantDone ?? 0) / selectedData.relevantTotal) * 100,
                            )
                          : 0
                      }
                    />
                    {selectedData && selectedData.relevantTotal > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.round(
                          ((selectedData.relevantDone ?? 0) / selectedData.relevantTotal) * 100,
                        )}
                        % of this student&apos;s materials completed.
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Assignments Progress</span>
                      <span className="font-medium">
                        {selectedData?.assignDone ?? 0} / {selectedData?.assignTotal ?? 0}{" "}
                        Completed
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-1.5"
                      value={
                        selectedData?.assignTotal
                          ? Math.round(((selectedData.assignDone ?? 0) / selectedData.assignTotal) * 100)
                          : 0
                      }
                      tone="accent"
                    />
                    {selectedData && selectedData.assignTotal > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.round(
                          ((selectedData.assignDone ?? 0) / selectedData.assignTotal) * 100,
                        )}
                        % of this student&apos;s assignments completed.
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Projects Progress</span>
                      <span className="font-medium">
                        {selectedData?.stats.completed ?? 0} / {selectedData?.stats.total ?? 0}{" "}
                        Completed
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-1.5"
                      value={selectedData?.stats.completionRate ?? 0}
                      tone="success"
                    />
                    {selectedData && selectedData.stats.total > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.round(selectedData.stats.completionRate)}% of this student&apos;s
                        projects completed.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="shadow-soft overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">All students</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((s) => {
                const p = (progress.data ?? []).find((x) => x.student_id === s.id);
                const rate = summarizeAttendance(
                  (attendance.data ?? []).filter((r) => r.student_id === s.id),
                ).rate;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      s.id === selected?.id
                        ? "border-secondary bg-accent/10"
                        : "border-border bg-card hover:bg-accent/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{s.name}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {s.current_level}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Overall progress</span>
                      <span className="font-medium text-foreground">
                        {p?.overall_progress ?? 0}%
                      </span>
                    </p>
                    <ProgressBar className="mt-1.5" value={p?.overall_progress ?? 0} />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Attendance {rate}% • Last update{" "}
                      {p?.updated_at ? formatDate(p.updated_at) : "—"}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
