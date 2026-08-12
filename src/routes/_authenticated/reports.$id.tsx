import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";

import { EmptyState, ProgressBar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAssignments,
  useLessons,
  useProgress,
  useProjects,
  useReports,
  useSettings,
  useStudents,
} from "@/hooks/use-data";
import { MONTHS, SKILLS as skillList, formatDate } from "@/lib/domain";
import { buildReportPdf } from "@/lib/pdf";

const reportSearch = z.object({
  print: z.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/reports/$id")({
  validateSearch: reportSearch,
  head: () => ({
    meta: [
      { title: "Monthly report — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Printable monthly student progress report with attendance, lessons, projects and skill analysis.",
      },
      { property: "og:title", content: "Monthly report — EasySpeak Teacher Management" },
      { property: "og:description", content: "Professional printable progress report." },
    ],
  }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const { print } = Route.useSearch();
  const reports = useReports();
  const students = useStudents();
  const settings = useSettings();
  const lessons = useLessons();
  const assignments = useAssignments();
  const projects = useProjects();
  const progress = useProgress();

  const report = useMemo(() => (reports.data ?? []).find((r) => r.id === id), [reports.data, id]);

  const student = useMemo(
    () => (students.data ?? []).find((s) => s.id === report?.student_id),
    [students.data, report],
  );

  const period = useMemo(
    () => (report ? `${report.year}-${String(report.month).padStart(2, "0")}` : ""),
    [report],
  );

  const periodLessons = useMemo(
    () =>
      (lessons.data ?? []).filter(
        (l) => l.student_id === report?.student_id && l.date.startsWith(period),
      ),
    [lessons.data, report, period],
  );

  const periodAssignments = useMemo(
    () =>
      (assignments.data ?? []).filter(
        (a) => a.student_id === report?.student_id && a.assigned_date.startsWith(period),
      ),
    [assignments.data, report, period],
  );

  const periodProjects = useMemo(
    () =>
      (projects.data ?? []).filter(
        (p) => p.student_id === report?.student_id && p.assigned_date.startsWith(period),
      ),
    [projects.data, report, period],
  );

  const prog = useMemo(
    () => (progress.data ?? []).find((p) => p.student_id === report?.student_id),
    [progress.data, report],
  );

  useEffect(() => {
    if (!print || !report || !student) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [print, report, student]);

  if (reports.isLoading || students.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading report…</p>;
  }

  if (!report || !student) {
    return (
      <EmptyState
        title="Report not found."
        description="This report may have been deleted."
        action={
          <Button asChild>
            <Link to="/reports">Back to reports</Link>
          </Button>
        }
      />
    );
  }

  const skills = (report.skills ?? {}) as Record<string, number>;
  const periodLabel = `${MONTHS[report.month - 1]} ${report.year}`;
  const schoolName = settings.data?.school_name ?? "EasySpeak Language School";
  const teacherName = settings.data?.teacher_name ?? "Teacher";

  const downloadPdf = () => {
    const doc = buildReportPdf({
      report,
      student,
      lessons: periodLessons,
      assignments: periodAssignments,
      projects: periodProjects,
      schoolName,
      teacherName,
    });
    doc.save(`monthly-report-${student.name}-${periodLabel.replace(" ", "-")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 print:hidden">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/reports">
              <ArrowLeft className="size-4" /> Back to reports
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{periodLabel} report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, print or download {student.name}&apos;s monthly progress report.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={downloadPdf}>
            <Download className="size-4" /> Download PDF
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => window.print()}>
            <Printer className="size-4" /> Print report
          </Button>
        </div>
      </div>

      <Card className="shadow-soft print:shadow-none print:border-none">
        <CardContent className="p-0">
          <div className="bg-primary text-primary-foreground px-4 py-5 print:bg-primary print:text-primary-foreground sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide uppercase opacity-80">
                  {schoolName}
                </p>
                <h2 className="mt-1 text-xl font-semibold">Student Progress Report</h2>
              </div>
              <div className="text-right">
                <p className="text-xs tracking-wide uppercase opacity-80">Reporting period</p>
                <p className="mt-0.5 text-sm font-medium">{periodLabel}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-4 py-5 sm:px-8 sm:py-7">
            <section>
              <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                Student information
              </h3>
              <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{student.name}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Student ID</dt>
                  <dd className="font-medium">{student.student_id}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Program</dt>
                  <dd className="font-medium">{student.program}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Level</dt>
                  <dd className="font-medium">{report.level ?? student.current_level}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Teacher</dt>
                  <dd className="font-medium">{teacherName}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Generated</dt>
                  <dd className="font-medium">{formatDate(report.created_at)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                Attendance summary
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
                {[
                  ["Total meetings", report.total_meetings],
                  ["Present", report.present],
                  ["Late", report.late],
                  ["Excused", report.excused],
                  ["Absent", report.absent],
                  ["Attendance rate", `${report.attendance_rate}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-muted/40 p-3 text-center"
                  >
                    <p className="text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                Lessons
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Total", report.lessons_total],
                  ["Completed", report.lessons_completed],
                  ["In progress", report.lessons_in_progress],
                  ["Planned", report.lessons_planned],
                  ["Completion", `${report.lessons_completed_percent}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-muted/40 p-3 text-center"
                  >
                    <p className="text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                Assignments
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Total", report.assignments_total],
                  ["Completed", report.assignments_completed],
                  ["In progress", report.assignments_in_progress],
                  ["Submitted", report.assignments_submitted],
                  ["Overdue", report.assignments_overdue],
                  ["Avg score", report.assignments_avg_score ?? "—"],
                  ["Completion", `${report.assignments_completion_percent}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-muted/40 p-3 text-center"
                  >
                    <p className="text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                Projects
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Total", report.projects_total],
                  ["Completed", report.projects_completed],
                  ["In progress", report.projects_in_progress],
                  ["Submitted", report.projects_submitted],
                  ["Overdue", report.projects_overdue],
                  ["Avg score", report.projects_avg_score ?? "—"],
                  ["Completion", `${report.projects_completion_percent}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-muted/40 p-3 text-center"
                  >
                    <p className="text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                Skill analysis
              </h3>
              <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {skillList.map((skill) => (
                  <div key={skill}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize text-foreground">{skill}</span>
                      <span className="font-medium text-foreground">{skills[skill] ?? 0}%</span>
                    </div>
                    <ProgressBar value={skills[skill] ?? 0} />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Overall progress</span>
                    <span className="font-medium text-foreground">{report.overall_progress}%</span>
                  </div>
                  <ProgressBar value={report.overall_progress} tone="success" />
                </div>
              </div>
            </section>

            {periodLessons.length > 0 && (
              <section>
                <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                  Materials covered
                </h3>
                <div className="mt-4 space-y-2">
                  {periodLessons.map((l) => (
                    <div
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{l.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {l.success_indicator?.trim()
                            ? l.success_indicator
                            : "Success indicator not added yet."}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(l.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {periodAssignments.length > 0 && (
              <section>
                <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                  Assignments completed
                </h3>
                <div className="mt-4 space-y-2">
                  {periodAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.type}
                          {a.status ? ` • ${a.status}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(a.due_date)}
                        </span>
                        <span className="font-medium">
                          {a.score ?? "—"}
                          {a.max_score ? ` / ${a.max_score}` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {periodProjects.length > 0 && (
              <section>
                <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                  Projects completed
                </h3>
                <div className="mt-4 space-y-2">
                  {periodProjects.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.type}
                          {prog ? ` • Level ${p.level ?? "—"}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.completed_date)}
                        </span>
                        <span className="font-medium">{p.score ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                Teacher&apos;s evaluation
              </h3>
              <div className="mt-4 space-y-6">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Strengths
                  </p>
                  <p className="mt-1.5 text-sm whitespace-pre-line text-foreground/90">
                    {report.strengths ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Areas to improve
                  </p>
                  <p className="mt-1.5 text-sm whitespace-pre-line text-foreground/90">
                    {report.areas_to_improve ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Evaluation
                  </p>
                  <p className="mt-1.5 text-sm whitespace-pre-line text-foreground/90">
                    {report.teacher_evaluation ?? "—"}
                  </p>
                </div>
              </div>
            </section>
            <section className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                  Next month&apos;s goals
                </h3>
                <p className="mt-3 text-sm whitespace-pre-line text-foreground/90">
                  {report.next_month_goals ?? "—"}
                </p>
              </div>
              <div>
                <h3 className="border-b-2 border-accent pb-1 text-xs font-semibold tracking-widest text-foreground uppercase">
                  Recommendations
                </h3>
                <p className="mt-3 text-sm whitespace-pre-line text-foreground/90">
                  {report.recommendations ?? "—"}
                </p>
              </div>
            </section>

            <section className="flex flex-wrap items-end justify-between gap-6 pt-4">
              <div className="border-t border-border pt-2">
                <p className="text-sm font-semibold text-foreground">{teacherName}</p>
                <p className="text-xs text-muted-foreground">Teacher signature</p>
              </div>
              <div className="border-t border-border pt-2 text-right">
                <p className="text-sm font-medium text-foreground">
                  {formatDate(report.created_at)}
                </p>
                <p className="text-xs text-muted-foreground">Date issued</p>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
