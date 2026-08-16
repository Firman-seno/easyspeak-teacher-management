import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, FileBarChart, Printer, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, PageHeader } from "@/components/kit";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAssignments,
  useAttendance,
  useLessons,
  useProgress,
  useProjects,
  useReports,
  useStudents,
} from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import {
  MONTHS,
  assessmentScoreKey,
  effectiveAssignmentStatus,
  effectiveProjectStatus,
  formatDate,
  summarizeAttendance,
} from "@/lib/domain";
import type { AssessmentSkill, MonthlyAssessment, MonthlyReport } from "@/lib/domain";
import { skillsFromProgress } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({
    meta: [
      { title: "Monthly Reports — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Generate and review printable monthly student progress reports.",
      },
      { property: "og:title", content: "Monthly Reports — EasySpeak Teacher Management" },
      { property: "og:description", content: "Printable monthly progress reports for parents." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const students = useStudents();
  const reports = useReports();
  const attendance = useAttendance();
  const lessons = useLessons();
  const assignments = useAssignments();
  const projects = useProjects();
  const progress = useProgress();

  const now = new Date();
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [evaluation, setEvaluation] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasToImprove, setAreasToImprove] = useState("");
  const [toDelete, setToDelete] = useState<MonthlyReport | null>(null);

  const nameOf = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s.name])),
    [students.data],
  );

  const active = useMemo(
    () => (students.data ?? []).filter((s) => s.status !== "Inactive"),
    [students.data],
  );

  const generate = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Select a student first.");
      const y = Number(year);
      const m = Number(month);
      if (!Number.isInteger(y) || y < 2000 || y > 2100)
        throw new Error("Please enter a valid year (2000–2100).");
      if (
        (reports.data ?? []).some(
          (r) => r.student_id === studentId && r.month === m && r.year === y,
        )
      )
        throw new Error("A report for this student and month already exists.");
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      const attRecords = (attendance.data ?? []).filter(
        (r) => r.student_id === studentId && r.date.startsWith(ym),
      );
      const att = summarizeAttendance(attRecords);
      const prog = (progress.data ?? []).find((p) => p.student_id === studentId);
      const student = (students.data ?? []).find((s) => s.id === studentId);
      const skills = skillsFromProgress(
        prog
          ? {
              speaking: prog.speaking,
              listening: prog.listening,
              reading: prog.reading,
              writing: prog.writing,
              vocabulary: prog.vocabulary,
              grammar: prog.grammar,
            }
          : {},
      );

      const lessonCount = (lessons.data ?? []).filter(
        (l) => l.student_id === studentId && l.status === "Completed" && l.date.startsWith(ym),
      ).length;
      const lessonsInMonth = (lessons.data ?? []).filter(
        (l) => l.student_id === studentId && l.date.startsWith(ym),
      );
      const assignmentsInMonth = (assignments.data ?? []).filter(
        (a) => a.student_id === studentId && a.assigned_date.startsWith(ym),
      );
      const projectsInMonth = (projects.data ?? []).filter(
        (p) => p.student_id === studentId && p.assigned_date.startsWith(ym),
      );

      const lessonsTotal = lessonsInMonth.length;
      const lessonsInProgress = lessonsInMonth.filter((l) => l.status === "In Progress").length;
      const lessonsPlanned = lessonsInMonth.filter((l) => l.status === "Planned").length;
      const lessonsCompletedPercent = lessonsTotal
        ? Math.round((lessonCount / lessonsTotal) * 100)
        : 0;

      const assignTotal = assignmentsInMonth.length;
      const assignCompleted = assignmentsInMonth.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "Completed",
      ).length;
      const assignInProgress = assignmentsInMonth.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "In Progress",
      ).length;
      const assignSubmitted = assignmentsInMonth.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "Submitted",
      ).length;
      const assignOverdue = assignmentsInMonth.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "Overdue",
      ).length;
      const assignScored = assignmentsInMonth.filter((a) => a.score !== null);
      const assignAvgScore = assignScored.length
        ? Math.round(assignScored.reduce((acc, a) => acc + (a.score ?? 0), 0) / assignScored.length)
        : null;
      const assignCompletionPercent = assignTotal
        ? Math.round((assignCompleted / assignTotal) * 100)
        : 0;

      const projTotal = projectsInMonth.length;
      const projCompleted = projectsInMonth.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "Completed",
      ).length;
      const projInProgress = projectsInMonth.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "In Progress",
      ).length;
      const projSubmitted = projectsInMonth.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "Submitted",
      ).length;
      const projOverdue = projectsInMonth.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "Overdue",
      ).length;
      const projScored = projectsInMonth.filter((p) => p.score !== null);
      const projAvgScore = projScored.length
        ? Math.round(projScored.reduce((acc, p) => acc + (p.score ?? 0), 0) / projScored.length)
        : null;
      const projCompletionPercent = projTotal ? Math.round((projCompleted / projTotal) * 100) : 0;

      // Monthly Assessment: pull every scored lesson in this month for this
      // student and pre-fill the computed monthly totals. Final scores and
      // percentages are recalculated automatically from the lesson scores on
      // the report detail page and persisted when "Save assessment" is used.
      const sumFor = (skill: AssessmentSkill): number | null => {
        const scored = lessonsInMonth.filter((l) => l[assessmentScoreKey(skill)] != null);
        if (!scored.length) return null;
        return scored.reduce((acc, l) => acc + (l[assessmentScoreKey(skill)] as number), 0);
      };
      const monthlyAssessment: MonthlyAssessment = {
        speaking: { total: sumFor("speaking"), final_score: null, percentage: null },
        listening: { total: sumFor("listening"), final_score: null, percentage: null },
        reading: { total: sumFor("reading"), final_score: null, percentage: null },
        writing: { total: sumFor("writing"), final_score: null, percentage: null },
        vocabulary: { total: sumFor("vocabulary"), final_score: null, percentage: null },
        overall: { monthly_score: null, percentage: null },
      };

      return api.saveReport({
        student_id: studentId,
        month: m,
        year: y,
        total_meetings: att.total,
        present: att.present,
        late: att.late,
        excused: att.excused,
        absent: att.absent,
        attendance_rate: att.rate,
        lessons_completed: lessonCount,
        lessons_total: lessonsTotal,
        lessons_in_progress: lessonsInProgress,
        lessons_planned: lessonsPlanned,
        lessons_completed_percent: lessonsCompletedPercent,
        assignments_total: assignTotal,
        assignments_completed: assignCompleted,
        assignments_in_progress: assignInProgress,
        assignments_submitted: assignSubmitted,
        assignments_overdue: assignOverdue,
        assignments_avg_score: assignAvgScore,
        assignments_completion_percent: assignCompletionPercent,
        projects_assigned: projTotal,
        projects_completed: projCompleted,
        projects_total: projTotal,
        projects_in_progress: projInProgress,
        projects_submitted: projSubmitted,
        projects_overdue: projOverdue,
        projects_avg_score: projAvgScore,
        projects_completion_percent: projCompletionPercent,
        overall_progress: prog?.overall_progress ?? 0,
        skills,
        monthly_assessment: monthlyAssessment,
        level: student?.current_level ?? null,
        teacher_evaluation: evaluation.trim() || null,
        recommendations: recommendations.trim() || null,
        strengths: strengths.trim() || null,
        areas_to_improve: areasToImprove.trim() || null,
      });
    },
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: qk.reports });
      toast.success("Report successfully generated.");
      setEvaluation("");
      setRecommendations("");
      setStrengths("");
      setAreasToImprove("");
      navigate({ to: "/reports/$id", params: { id: report.id } });
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reports });
      toast.success("Report successfully deleted.");
      setToDelete(null);
    },
    onError: () => toast.error("Something went wrong."),
  });

  const currentMonth = `${year}-${String(Number(month)).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Reports"
        description="Generate professional monthly progress reports and share them with parents."
      />

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-accent" /> Generate report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Report data</Label>
              <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                Attendance, lessons, assignments, projects and progress are calculated from the
                selected month.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="evaluation">Teacher evaluation</Label>
              <Textarea
                id="evaluation"
                value={evaluation}
                onChange={(e) => setEvaluation(e.target.value)}
                placeholder="Brief evaluation of the student's performance this month…"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Suggestions for next month…"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="strengths">Strengths</Label>
              <Textarea
                id="strengths"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="What the student did well this month…"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="areas-to-improve">Areas to improve</Label>
              <Textarea
                id="areas-to-improve"
                value={areasToImprove}
                onChange={(e) => setAreasToImprove(e.target.value)}
                placeholder="Skills or habits to work on…"
                rows={3}
              />
            </div>
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending || !studentId}>
            <FileBarChart className="size-4" /> Generate report
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Saved reports</CardTitle>
        </CardHeader>
        {reports.isError ? (
          <CardContent>
            <EmptyState
              title="Unable to load your reports."
              description={reports.error?.message ?? "Something went wrong while fetching reports."}
              action={
                <Button variant="outline" onClick={() => reports.refetch()}>
                  Try Again
                </Button>
              }
            />
          </CardContent>
        ) : (reports.data ?? []).length === 0 ? (
          <CardContent>
            <EmptyState
              title="No reports generated yet."
              description="Use the form above to create your first monthly report."
            />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reports.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{nameOf.get(r.student_id) ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {MONTHS[r.month - 1]} {r.year}
                    </TableCell>
                    <TableCell>{r.attendance_rate}%</TableCell>
                    <TableCell>{r.lessons_completed}</TableCell>
                    <TableCell>
                      {r.assignments_completed}/{r.assignments_total}
                    </TableCell>
                    <TableCell>
                      {r.projects_completed}/{r.projects_total}
                    </TableCell>
                    <TableCell>{r.overall_progress}%</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" title="View Report">
                          <Link to="/reports/$id" params={{ id: r.id }}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button asChild size="icon" variant="ghost" title="Print Report">
                          <Link to="/reports/$id" params={{ id: r.id }} search={{ print: true }}>
                            <Printer className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => setToDelete(r)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this report?"
        description="This action cannot be undone."
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
