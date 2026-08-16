import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { AssignmentFormDialog } from "@/components/assignment-form";
import { EmptyState, ProgressBar, StatusBadge, statusTone } from "@/components/kit";
import { LessonFormDialog } from "@/components/lesson-form";
import { ProjectFormDialog } from "@/components/project-form";
import { StudentFormDialog } from "@/components/student-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAssignments,
  useAttendance,
  useLessons,
  useProgress,
  useProgressHistory,
  useProjects,
  useReports,
  useStudents,
} from "@/hooks/use-data";
import {
  SKILLS,
  attendanceLabel,
  effectiveAssignmentStatus,
  effectiveProjectStatus,
  formatDate,
  initials,
  projectStats,
  reportPeriodShort,
  summarizeAttendance,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/students/$id")({
  head: () => ({
    meta: [
      { title: "Student profile — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Detailed student profile: attendance history, lessons, assignments, projects, skill progress and reports.",
      },
      { property: "og:title", content: "Student profile — EasySpeak Teacher Management" },
      {
        property: "og:description",
        content: "Attendance, lessons, assignments, projects and skill progress.",
      },
    ],
  }),
  component: StudentDetail,
});

function StudentDetail() {
  const { id } = Route.useParams();
  const students = useStudents();
  const attendance = useAttendance();
  const lessons = useLessons();
  const assignments = useAssignments();
  const projects = useProjects();
  const progress = useProgress();
  const history = useProgressHistory(id);
  const reports = useReports();
  const [editOpen, setEditOpen] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  const student = (students.data ?? []).find((s) => s.id === id);

  const data = useMemo(() => {
    const records = (attendance.data ?? []).filter((a) => a.student_id === id);
    const proj = (projects.data ?? []).filter((p) => p.student_id === id);
    const assign = (assignments.data ?? []).filter((a) => a.student_id === id);
    const prog = (progress.data ?? []).find((p) => p.student_id === id);
    const covered = (lessons.data ?? []).filter((l) => l.student_id === id);
    return {
      att: summarizeAttendance(records),
      records,
      proj,
      assign,
      stats: projectStats(proj),
      prog,
      covered,
      reports: (reports.data ?? []).filter((r) => r.student_id === id),
    };
  }, [
    attendance.data,
    projects.data,
    assignments.data,
    progress.data,
    lessons.data,
    reports.data,
    id,
  ]);

  if (students.isLoading) return <p className="text-sm text-muted-foreground">Loading student…</p>;
  if (!student)
    return (
      <EmptyState
        title="Student not found."
        action={
          <Button asChild>
            <Link to="/students">Back to students</Link>
          </Button>
        }
      />
    );

  const label = attendanceLabel(data.att.rate);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/students">
          <ArrowLeft className="size-4" /> Back to students
        </Link>
      </Button>

      <Card className="shadow-soft">
        <CardContent className="flex flex-col items-stretch gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-16 shrink-0">
              {student.photo && <AvatarImage src={student.photo} alt={student.name} />}
              <AvatarFallback className="text-lg">{initials(student.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{student.name}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {student.student_id} • {student.program}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge tone="secondary">Level {student.current_level}</StatusBadge>
                <StatusBadge tone="accent">Target {student.target_level}</StatusBadge>
                <StatusBadge tone={statusTone(student.status)}>{student.status}</StatusBadge>
                <StatusBadge>Enrolled {formatDate(student.enrollment_date)}</StatusBadge>
              </div>
            </div>
          </div>
          <Button variant="outline" className="shrink-0" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="lessons">Lessons / Materials</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Attendance rate</span>
                <StatusBadge tone={label.tone}>
                  {data.att.rate}% • {label.label}
                </StatusBadge>
              </div>
              <ProgressBar value={data.att.rate} tone={label.tone} />
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                {[
                  ["Meetings", data.att.total],
                  ["Present", data.att.present],
                  ["Late", data.att.late],
                  ["Excused", data.att.excused],
                  ["Absent", data.att.absent],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Learning summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Lessons covered</span>
                <span className="font-semibold">{data.covered.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Assignments</span>
                <span className="font-semibold">{data.assign.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Projects</span>
                <span className="font-semibold">{data.stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed projects</span>
                <span className="font-semibold">
                  {data.stats.completed} / {data.stats.total}
                </span>
              </div>
              <ProgressBar value={data.stats.completionRate} tone="success" />
              <div className="flex justify-between pt-2">
                <span>Overall progress</span>
                <span className="font-semibold">{data.prog?.overall_progress ?? 0}%</span>
              </div>
              <ProgressBar value={data.prog?.overall_progress ?? 0} />
              <div className="flex justify-between pt-2">
                <span>Current → target level</span>
                <span className="font-semibold">
                  {student.current_level} → {student.target_level}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card className="shadow-soft overflow-hidden">
            {data.records.length === 0 ? (
              <EmptyState title="No attendance records yet." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.date)}</TableCell>
                        <TableCell>{r.meeting ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                        </TableCell>
                        <TableCell>{r.check_in_time ?? "—"}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{r.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data.covered.length} lesson{data.covered.length === 1 ? "" : "s"} recorded for this
              student.
            </p>
            <Button onClick={() => setLessonFormOpen(true)}>
              <Plus className="size-4" /> Add Material for {student.name}
            </Button>
          </div>
          <Card className="shadow-soft overflow-hidden">
            {data.covered.length === 0 ? (
              <EmptyState
                title="No lessons recorded yet."
                description="Create the first material for this student."
                action={
                  <Button onClick={() => setLessonFormOpen(true)}>
                    <Plus className="size-4" /> Add Material
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Subtitle</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Grammar</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.covered.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(l.date)}</TableCell>
                        <TableCell className="font-medium">{l.title}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {l.subtitle ?? "—"}
                        </TableCell>
                        <TableCell>{l.level ?? "—"}</TableCell>
                        <TableCell>{l.topic ?? "—"}</TableCell>
                        <TableCell>{l.grammar ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data.assign.length} assignment{data.assign.length === 1 ? "" : "s"} for this student.
            </p>
            <Button onClick={() => setAssignmentFormOpen(true)}>
              <Plus className="size-4" /> Add Assignment
            </Button>
          </div>
          <Card className="shadow-soft overflow-hidden">
            {data.assign.length === 0 ? (
              <EmptyState
                title="No assignments yet."
                description="Create an assignment for this student."
                action={
                  <Button onClick={() => setAssignmentFormOpen(true)}>
                    <Plus className="size-4" /> Add Assignment
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assign.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>{a.type}</TableCell>
                        <TableCell>{formatDate(a.assigned_date)}</TableCell>
                        <TableCell>{formatDate(a.due_date)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={statusTone(effectiveAssignmentStatus(a.status, a.due_date))}
                          >
                            {effectiveAssignmentStatus(a.status, a.due_date)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {a.score === null || a.score === undefined
                            ? "—"
                            : a.max_score
                              ? `${a.score}/${a.max_score}`
                              : a.score}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data.proj.length} project{data.proj.length === 1 ? "" : "s"} for this student.
            </p>
            <Button onClick={() => setProjectFormOpen(true)}>
              <Plus className="size-4" /> Add Project
            </Button>
          </div>
          <Card className="shadow-soft overflow-hidden">
            {data.proj.length === 0 ? (
              <EmptyState
                title="No projects yet."
                description="Create a project for this student."
                action={
                  <Button onClick={() => setProjectFormOpen(true)}>
                    <Plus className="size-4" /> Add Project
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.proj.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell>{p.type}</TableCell>
                        <TableCell>{formatDate(p.assigned_date)}</TableCell>
                        <TableCell>{formatDate(p.due_date)}</TableCell>
                        <TableCell>{p.progress}%</TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={statusTone(effectiveProjectStatus(p.status, p.due_date))}
                          >
                            {effectiveProjectStatus(p.status, p.due_date)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{p.score ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Skill progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {SKILLS.map((skill) => {
                const value = (data.prog?.[skill] as number | undefined) ?? 0;
                return (
                  <div key={skill} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{skill}</span>
                      <span className="font-medium">{value}%</span>
                    </div>
                    <ProgressBar value={value} tone="accent" />
                  </div>
                );
              })}
              <div className="border-t pt-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Overall progress</span>
                  <span>{data.prog?.overall_progress ?? 0}%</span>
                </div>
                <ProgressBar className="mt-2" value={data.prog?.overall_progress ?? 0} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Progress history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(history.data ?? []).length === 0 ? (
                <EmptyState title="No progress updates yet." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Skill</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>New</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(history.data ?? []).map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>{formatDate(h.created_at)}</TableCell>
                          <TableCell className="capitalize">{h.skill}</TableCell>
                          <TableCell>{h.previous_score ?? "—"}</TableCell>
                          <TableCell>{h.new_score ?? "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{h.notes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card className="shadow-soft overflow-hidden">
            {data.reports.length === 0 ? (
              <EmptyState
                title="No monthly reports generated yet."
                action={
                  <Button asChild>
                    <Link to="/reports">Create Report</Link>
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.reports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{reportPeriodShort(r)}</TableCell>
                        <TableCell>{r.attendance_rate}%</TableCell>
                        <TableCell>{r.overall_progress}%</TableCell>
                        <TableCell>{formatDate(r.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student} />
      <LessonFormDialog
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        students={students.data ?? []}
        presetStudentId={id}
      />
      <AssignmentFormDialog
        open={assignmentFormOpen}
        onOpenChange={setAssignmentFormOpen}
        students={students.data ?? []}
        lessons={lessons.data ?? []}
        presetStudentId={id}
      />
      <ProjectFormDialog
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
        students={students.data ?? []}
        lessons={lessons.data ?? []}
        presetStudentId={id}
      />
    </div>
  );
}
