import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Eye, FileBarChart, Printer, Sparkles, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, PageHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DatePickerField } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  assessmentScoreKey,
  effectiveAssignmentStatus,
  effectiveProjectStatus,
  formatDate,
  inDateRange,
  reportPeriodShort,
  summarizeAttendance,
} from "@/lib/domain";
import type { AssessmentSkill, MonthlyAssessment, MonthlyReport } from "@/lib/domain";
import { cn } from "@/lib/utils";
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

  const [studentId, setStudentId] = useState("");
  const [studentOpen, setStudentOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
      if (!startDate) throw new Error("Select a start date.");
      if (!endDate) throw new Error("Select an end date.");
      if (endDate < startDate) throw new Error("End date cannot be earlier than start date.");
      if (
        (reports.data ?? []).some(
          (r) => r.student_id === studentId && r.start_date === startDate && r.end_date === endDate,
        )
      )
        throw new Error("A report for this student and date range already exists.");
      const attRecords = (attendance.data ?? []).filter(
        (r) => r.student_id === studentId && inDateRange(r.date, startDate, endDate),
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

      const lessonsInPeriod = (lessons.data ?? []).filter(
        (l) => l.student_id === studentId && inDateRange(l.date, startDate, endDate),
      );
      const assignmentsInPeriod = (assignments.data ?? []).filter(
        (a) => a.student_id === studentId && inDateRange(a.assigned_date, startDate, endDate),
      );
      const projectsInPeriod = (projects.data ?? []).filter(
        (p) => p.student_id === studentId && inDateRange(p.assigned_date, startDate, endDate),
      );

      const lessonsTotal = lessonsInPeriod.length;
      const lessonCount = lessonsInPeriod.filter((l) => l.status === "Completed").length;
      const lessonsInProgress = lessonsInPeriod.filter((l) => l.status === "In Progress").length;
      const lessonsPlanned = lessonsInPeriod.filter((l) => l.status === "Planned").length;
      const lessonsCompletedPercent = lessonsTotal
        ? Math.round((lessonCount / lessonsTotal) * 100)
        : 0;

      const assignTotal = assignmentsInPeriod.length;
      const assignCompleted = assignmentsInPeriod.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "Completed",
      ).length;
      const assignInProgress = assignmentsInPeriod.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "In Progress",
      ).length;
      const assignSubmitted = assignmentsInPeriod.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "Submitted",
      ).length;
      const assignOverdue = assignmentsInPeriod.filter(
        (a) => effectiveAssignmentStatus(a.status, a.due_date) === "Overdue",
      ).length;
      const assignScored = assignmentsInPeriod.filter((a) => a.score !== null);
      const assignAvgScore = assignScored.length
        ? Math.round(assignScored.reduce((acc, a) => acc + (a.score ?? 0), 0) / assignScored.length)
        : null;
      const assignCompletionPercent = assignTotal
        ? Math.round((assignCompleted / assignTotal) * 100)
        : 0;

      const projTotal = projectsInPeriod.length;
      const projCompleted = projectsInPeriod.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "Completed",
      ).length;
      const projInProgress = projectsInPeriod.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "In Progress",
      ).length;
      const projSubmitted = projectsInPeriod.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "Submitted",
      ).length;
      const projOverdue = projectsInPeriod.filter(
        (p) => effectiveProjectStatus(p.status, p.due_date) === "Overdue",
      ).length;
      const projScored = projectsInPeriod.filter((p) => p.score !== null);
      const projAvgScore = projScored.length
        ? Math.round(projScored.reduce((acc, p) => acc + (p.score ?? 0), 0) / projScored.length)
        : null;
      const projCompletionPercent = projTotal ? Math.round((projCompleted / projTotal) * 100) : 0;

      // Monthly Assessment: pull every scored lesson in this date range for
      // this student and pre-fill the computed totals. Final scores and
      // percentages are recalculated automatically from the lesson scores on
      // the report detail page and persisted when "Save assessment" is used.
      const sumFor = (skill: AssessmentSkill): number | null => {
        const scored = lessonsInPeriod.filter((l) => l[assessmentScoreKey(skill)] != null);
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
        month: Number(startDate.slice(5, 7)),
        year: Number(startDate.slice(0, 4)),
        start_date: startDate,
        end_date: endDate,
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
              <Popover open={studentOpen} onOpenChange={setStudentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={studentOpen}
                    className="w-full justify-between font-normal"
                  >
                    {studentId ? (
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        <UserRound className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {nameOf.get(studentId) ?? "—"}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <UserRound className="size-4 shrink-0" />
                        Select student
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(90vw,var(--radix-popover-trigger-width))] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search student..." />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {active.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={() => {
                              setStudentId(s.id);
                              setStudentOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                studentId === s.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="truncate">{s.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <DatePickerField
              id="start-date"
              label="Start Date *"
              value={startDate}
              onChange={setStartDate}
              to={endDate || undefined}
              helper="Select the first day of the report period."
            />
            <DatePickerField
              id="end-date"
              label="End Date *"
              value={endDate}
              onChange={setEndDate}
              from={startDate || undefined}
              error={
                startDate && endDate && endDate < startDate
                  ? "End date cannot be earlier than start date."
                  : undefined
              }
              helper="Select the last day of the report period."
            />
            <div className="space-y-1.5">
              <Label>Report data</Label>
              <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                Attendance, lessons, assignments, projects and progress are calculated from the
                selected date range.
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
                placeholder="Brief evaluation of the student's performance in the selected period…"
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
          <Button
            onClick={() => generate.mutate()}
            disabled={
              generate.isPending ||
              !studentId ||
              !startDate ||
              !endDate ||
              (!!startDate && !!endDate && endDate < startDate)
            }
          >
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
              description="Use the form above to create your first report."
            />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date Range</TableHead>
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
                    <TableCell className="whitespace-nowrap">{reportPeriodShort(r)}</TableCell>
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
