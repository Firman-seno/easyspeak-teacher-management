import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, PageHeader, StatusBadge, statusTone } from "@/components/kit";
import { LessonFormDialog } from "@/components/lesson-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLessons, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { LESSON_STATUSES, LEVELS, PROGRAMS, formatDate } from "@/lib/domain";
import type { Lesson } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/lessons/")({
  head: () => ({
    meta: [
      { title: "Lessons / Materials — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Create and manage personalised lesson materials for every student. Add, edit, filter and track materials by student.",
      },
      { property: "og:title", content: "Lessons / Materials — EasySpeak Teacher Management" },
      {
        property: "og:description",
        content: "Teacher-managed materials library for every student.",
      },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const qc = useQueryClient();
  const lessons = useLessons();
  const students = useStudents();

  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("all");
  const [level, setLevel] = useState("all");
  const [program, setProgram] = useState("all");
  const [topic, setTopic] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [toDelete, setToDelete] = useState<Lesson | null>(null);

  const nameOf = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s.name])),
    [students.data],
  );

  const studentOf = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s])),
    [students.data],
  );

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const l of lessons.data ?? []) if (l.topic) set.add(l.topic);
    return [...set].sort();
  }, [lessons.data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lessons.data ?? [])
      .filter(
        (l) =>
          !q ||
          `${l.title} ${l.subtitle ?? ""} ${l.topic ?? ""} ${l.unit ?? ""} ${l.program ?? ""} ${l.level ?? ""}`
            .toLowerCase()
            .includes(q),
      )
      .filter((l) => studentId === "all" || l.student_id === studentId)
      .filter((l) => level === "all" || l.level === level)
      .filter((l) => program === "all" || l.program === program)
      .filter((l) => topic === "all" || l.topic === topic)
      .filter((l) => status === "all" || l.status === status)
      .filter((l) => !date || l.date === date);
  }, [lessons.data, search, studentId, level, program, topic, status, date]);

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.lessons });
      toast.success("Material successfully deleted.");
      setToDelete(null);
    },
    onError: () => toast.error("Something went wrong."),
  });

  const studentOptions = useMemo(() => {
    const studentsList = [...(students.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    if (studentId !== "all") {
      const current = studentsList.find((s) => s.id === studentId);
      if (current) {
        studentsList.splice(
          studentsList.findIndex((s) => s.id === studentId),
          1,
        );
        studentsList.unshift(current);
      }
    }
    return studentsList;
  }, [students.data, studentId]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons / Materials"
        description="Create and manage personalised lesson materials for each student."
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Add Material
          </Button>
        }
      />

      <Card className="shadow-soft p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, subtitle, topic or unit"
              className="pl-9"
            />
          </div>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {studentOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger>
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {PROGRAMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger>
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LESSON_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="md:col-span-2 xl:col-span-2"
          />
        </div>
      </Card>

      {lessons.isError || students.isError ? (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <EmptyState
              title="Unable to load your materials."
              description={
                (lessons.error ?? students.error)?.message ??
                "Something went wrong while fetching materials."
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    lessons.refetch();
                    students.refetch();
                  }}
                >
                  Try Again
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : lessons.isLoading || students.isLoading ? (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading materials…</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          description="Create your first lesson for a student."
          action={
            <Button onClick={openAdd}>
              <Plus className="size-4" /> Add Material
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((lesson) => {
            const studentName = lesson.student_id ? (nameOf.get(lesson.student_id) ?? "—") : "—";
            const student = lesson.student_id ? studentOf.get(lesson.student_id) : undefined;
            return (
              <Card key={lesson.id} className="shadow-soft flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge tone={statusTone(lesson.status)}>{lesson.status}</StatusBadge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Options">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/lessons/$id" params={{ id: lesson.id }}>
                              <Eye className="size-4" /> View Lesson
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(lesson)}>
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToDelete(lesson)}
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">{lesson.title}</h3>
                    {lesson.subtitle && (
                      <p className="mt-0.5 truncate text-sm font-medium text-accent-foreground">
                        {lesson.subtitle}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {lesson.topic ?? "General topic"} • {lesson.unit ?? "No unit"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 px-3 py-2">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-foreground">
                      <UserRound className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        Student
                      </p>
                      <p className="truncate text-sm font-semibold text-foreground">
                        {studentName}
                      </p>
                    </div>
                    {student && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        {student.current_level}
                      </span>
                    )}
                  </div>

                  {(lesson.objective || lesson.content) && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {lesson.objective ?? lesson.content}
                    </p>
                  )}

                  {lesson.success_indicator && (
                    <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <span className="line-clamp-2">{lesson.success_indicator}</span>
                    </div>
                  )}

                  <dl className="mt-auto grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted px-2.5 py-2">
                      <dt className="text-muted-foreground">Level</dt>
                      <dd className="font-medium">{lesson.level ?? "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-muted px-2.5 py-2">
                      <dt className="text-muted-foreground">Program</dt>
                      <dd className="truncate font-medium">{lesson.program ?? "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-muted px-2.5 py-2">
                      <dt className="text-muted-foreground">Teacher</dt>
                      <dd className="truncate font-medium">{student?.teacher ?? "Teacher"}</dd>
                    </div>
                    <div className="rounded-lg bg-muted px-2.5 py-2">
                      <dt className="text-muted-foreground">Date</dt>
                      <dd className="font-medium">{formatDate(lesson.date)}</dd>
                    </div>
                  </dl>

                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link to="/lessons/$id" params={{ id: lesson.id }}>
                        View Lesson
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Edit"
                      onClick={() => openEdit(lesson)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LessonFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lesson={editing}
        students={students.data ?? []}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this material?"
        description="This action cannot be undone."
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
