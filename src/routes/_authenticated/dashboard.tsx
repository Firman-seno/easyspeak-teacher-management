import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  FolderKanban,
  Percent,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAssignments,
  useAttendance,
  useProgress,
  useProjects,
  useStudents,
} from "@/hooks/use-data";
import {
  ASSIGNMENT_STATUSES,
  LEVELS,
  PROJECT_STATUSES,
  effectiveAssignmentStatus,
  effectiveProjectStatus,
  summarizeAttendance,
  todayISO,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Overview of student attendance, learning progress, assignment and project completion, and CEFR level distribution.",
      },
      { property: "og:title", content: "Dashboard — EasySpeak Teacher Management" },
      {
        property: "og:description",
        content: "Live teaching statistics: attendance, progress, assignments, projects and levels.",
      },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
  "var(--accent)",
];

function Dashboard() {
  const students = useStudents();
  const attendance = useAttendance();
  const assignments = useAssignments();
  const projects = useProjects();
  const progress = useProgress();

  const data = useMemo(() => {
    const all = students.data ?? [];
    const active = all.filter((s) => s.status === "Active");
    const records = attendance.data ?? [];
    const today = todayISO();
    const month = today.slice(0, 7);
    const monthRecords = records.filter((r) => r.date.startsWith(month));
    const assign = assignments.data ?? [];
    const proj = projects.data ?? [];
    const prog = progress.data ?? [];

    const byStudentRate = new Map<string, number>();
    for (const s of all) {
      byStudentRate.set(
        s.id,
        summarizeAttendance(records.filter((r) => r.student_id === s.id)).rate,
      );
    }

    const avgProgress = prog.length
      ? Math.round(prog.reduce((a, p) => a + p.overall_progress, 0) / prog.length)
      : 0;

    const attention = active.filter((s) => {
      const rate = byStudentRate.get(s.id) ?? 0;
      const p = prog.find((x) => x.student_id === s.id);
      return rate < 80 || (p?.overall_progress ?? 0) < 50;
    });

    const days = [...new Set(records.map((r) => r.date))].sort().slice(-12);
    const attendanceSeries = days.map((d) => {
      const dayRecords = records.filter((r) => r.date === d);
      return {
        date: d.slice(5),
        present: dayRecords.filter((r) => r.status === "Present").length,
        late: dayRecords.filter((r) => r.status === "Late").length,
        absent: dayRecords.filter((r) => r.status === "Absent").length,
      };
    });

    const progressSeries = all
      .map((s) => ({
        name: s.name.split(" ")[0] ?? s.name,
        progress: prog.find((p) => p.student_id === s.id)?.overall_progress ?? 0,
      }))
      .slice(0, 10);

    const levelSeries = LEVELS.map((l) => ({
      name: l,
      value: all.filter((s) => s.current_level === l).length,
    })).filter((l) => l.value > 0);

    const countByStatus = (
      rows: { status: string; due_date: string | null }[],
      statuses: readonly string[],
      effective: (status: string, dueDate?: string | null) => string,
    ) =>
      statuses.map((s) => ({
        name: s,
        value: rows.filter((r) => effective(r.status, r.due_date) === s).length,
      }));

    const assignmentSeries = countByStatus(assign, ASSIGNMENT_STATUSES, effectiveAssignmentStatus);
    const projectSeries = countByStatus(proj, PROJECT_STATUSES, effectiveProjectStatus);

    const assignmentCounts = Object.fromEntries(assignmentSeries.map((s) => [s.name, s.value]));
    const projectCounts = Object.fromEntries(projectSeries.map((s) => [s.name, s.value]));

    return {
      totalStudents: active.length,
      todayAttendance: records.filter((r) => r.date === today && r.status !== "Absent").length,
      monthRate: summarizeAttendance(monthRecords).rate,
      activeAssignments:
        (assignmentCounts["Assigned"] ?? 0) + (assignmentCounts["In Progress"] ?? 0),
      completedAssignments: assignmentCounts["Completed"] ?? 0,
      activeProjects:
        (projectCounts["Planned"] ?? 0) + (projectCounts["In Progress"] ?? 0),
      completedProjects: projectCounts["Completed"] ?? 0,
      avgProgress,
      attention: attention.length,
      attendanceSeries,
      progressSeries,
      levelSeries,
      assignmentSeries,
      projectSeries,
    };
  }, [students.data, attendance.data, assignments.data, projects.data, progress.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live overview of your classes, attendance and learning progress."
        actions={
          <>
            <Button asChild size="sm">
              <Link to="/students">
                <Users className="size-4" /> Add Student
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/attendance">
                <CalendarCheck className="size-4" /> Record Attendance
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/lessons">
                <BookOpen className="size-4" /> Add Lesson
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/assignments">
                <ClipboardList className="size-4" /> Add Assignment
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/projects">
                <FolderKanban className="size-4" /> Add Project
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/progress">
                <TrendingUp className="size-4" /> Update Progress
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/reports">
                <FileBarChart className="size-4" /> Generate Report
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={data.totalStudents}
          hint="Active enrolments"
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Today's Attendance"
          value={data.todayAttendance}
          hint="Present or late today"
          tone="accent"
          icon={<CalendarCheck className="size-5" />}
        />
        <StatCard
          label="Attendance Rate"
          value={`${data.monthRate}%`}
          hint="Current month"
          tone="success"
          icon={<Percent className="size-5" />}
        />
        <StatCard
          label="Average Progress"
          value={`${data.avgProgress}%`}
          hint="All students"
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          label="Active Assignments"
          value={data.activeAssignments}
          hint="Assigned or in progress"
          tone="warning"
          icon={<ClipboardList className="size-5" />}
        />
        <StatCard
          label="Completed Assignments"
          value={data.completedAssignments}
          tone="success"
          icon={<CheckCircle2 className="size-5" />}
        />
        <StatCard
          label="Active Projects"
          value={data.activeProjects}
          hint="Planned or in progress"
          tone="warning"
          icon={<FolderKanban className="size-5" />}
        />
        <StatCard
          label="Completed Projects"
          value={data.completedProjects}
          tone="success"
          icon={<CheckCircle2 className="size-5" />}
        />
        <StatCard
          label="Needing Attention"
          value={data.attention}
          hint="Low attendance or progress"
          tone="danger"
          icon={<TriangleAlert className="size-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.attendanceSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="present" stroke="var(--chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="late" stroke="var(--chart-4)" strokeWidth={2} />
                <Line type="monotone" dataKey="absent" stroke="var(--destructive)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Student Progress</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.progressSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="progress" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Students by Level</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.levelSeries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  label
                >
                  {data.levelSeries.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Assignment Completion</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.assignmentSeries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="name" width={90} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-4)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Project Completion</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.projectSeries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="name" width={90} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
