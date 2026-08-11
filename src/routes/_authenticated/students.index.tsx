import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatusBadge,
  statusTone,
} from "@/components/kit";
import { StudentFormDialog } from "@/components/student-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAttendance, useProgress, useProjects, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import {
  LEVELS,
  PROGRAMS,
  STUDENT_STATUSES,
  attendanceLabel,
  initials,
  projectStats,
  summarizeAttendance,
} from "@/lib/domain";
import type { Student } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/students/")({
  head: () => ({
    meta: [
      { title: "Students — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Search, filter and manage every enrolled student, their level, attendance and progress.",
      },
      { property: "og:title", content: "Students — EasySpeak Teacher Management" },
      { property: "og:description", content: "Full student directory with attendance and progress." },
    ],
  }),
  component: StudentsPage,
});

const PAGE_SIZE = 8;

function StudentsPage() {
  const qc = useQueryClient();
  const students = useStudents();
  const attendance = useAttendance();
  const progress = useProgress();
  const projects = useProjects();

  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("all");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [toDelete, setToDelete] = useState<Student | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteStudent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.students });
      toast.success("Data successfully deleted.");
      setToDelete(null);
    },
    onError: () => toast.error("Something went wrong."),
  });

  const rows = useMemo(() => {
    const list = (students.data ?? []).map((s) => {
      const att = summarizeAttendance((attendance.data ?? []).filter((a) => a.student_id === s.id));
      const prog = (progress.data ?? []).find((p) => p.student_id === s.id);
      const stats = projectStats((projects.data ?? []).filter((p) => p.student_id === s.id));
      return { student: s, att, progress: prog?.overall_progress ?? 0, stats };
    });

    const q = search.trim().toLowerCase();
    const filtered = list.filter(({ student, att, progress: pr }) => {
      if (q && !`${student.name} ${student.student_id}`.toLowerCase().includes(q)) return false;
      if (program !== "all" && student.program !== program) return false;
      if (level !== "all" && student.current_level !== level) return false;
      if (status !== "all" && student.status !== status) return false;
      if (attendanceFilter === "high" && att.rate < 90) return false;
      if (attendanceFilter === "mid" && (att.rate < 70 || att.rate >= 90)) return false;
      if (attendanceFilter === "low" && att.rate >= 70) return false;
      if (progressFilter === "high" && pr < 75) return false;
      if (progressFilter === "mid" && (pr < 50 || pr >= 75)) return false;
      if (progressFilter === "low" && pr >= 50) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sort === "progress") return b.progress - a.progress;
      if (sort === "attendance") return b.att.rate - a.att.rate;
      if (sort === "level") return LEVELS.indexOf(b.student.current_level as never) -
        LEVELS.indexOf(a.student.current_level as never);
      return a.student.name.localeCompare(b.student.name);
    });

    return filtered;
  }, [
    students.data,
    attendance.data,
    progress.data,
    projects.data,
    search,
    program,
    level,
    status,
    attendanceFilter,
    progressFilter,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = rows.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${rows.length} student${rows.length === 1 ? "" : "s"} matching your filters.`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add Student
          </Button>
        }
      />

      <Card className="shadow-soft p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <div className="relative xl:col-span-2">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or student ID"
              className="pl-9"
            />
          </div>
          <FilterSelect value={program} onChange={setProgram} label="Program" options={PROGRAMS} />
          <FilterSelect value={level} onChange={setLevel} label="Level" options={LEVELS} />
          <FilterSelect
            value={status}
            onChange={setStatus}
            label="Status"
            options={STUDENT_STATUSES}
          />
          <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Attendance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All attendance</SelectItem>
              <SelectItem value="high">90% and above</SelectItem>
              <SelectItem value="mid">70–89%</SelectItem>
              <SelectItem value="low">Below 70%</SelectItem>
            </SelectContent>
          </Select>
          <Select value={progressFilter} onValueChange={setProgressFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Progress" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All progress</SelectItem>
              <SelectItem value="high">75% and above</SelectItem>
              <SelectItem value="mid">50–74%</SelectItem>
              <SelectItem value="low">Below 50%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="attendance">Attendance</SelectItem>
              <SelectItem value="level">Level</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-soft overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title="No students found."
            description="Add your first student to start tracking attendance and progress."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> Add Student
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map(({ student, att, progress: pr, stats }) => {
                  const label = attendanceLabel(att.rate);
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9 shrink-0">
                            {student.photo && <AvatarImage src={student.photo} alt={student.name} />}
                            <AvatarFallback>{initials(student.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{student.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {att.total} meetings
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{student.student_id}</TableCell>
                      <TableCell className="text-sm">{student.program}</TableCell>
                      <TableCell>
                        <StatusBadge tone="secondary">{student.current_level}</StatusBadge>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={att.rate} tone={label.tone} className="w-20" />
                          <span className="text-xs">{att.rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={pr} className="w-20" />
                          <span className="text-xs">{pr}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {stats.completed}/{stats.total} ({stats.completionRate}%)
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={statusTone(student.status)}>{student.status}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" title="View">
                            <Link to="/students/$id" params={{ id: student.id }}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Edit"
                            onClick={() => {
                              setEditing(student);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Delete"
                            onClick={() => setToDelete(student)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {Math.min(page, pageCount)} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Are you sure you want to delete this student?"
        description={`${toDelete?.name} and all related attendance, projects and progress records will be permanently removed.`}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
