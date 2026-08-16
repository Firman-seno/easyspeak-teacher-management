import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, PageHeader, statusTone, toneClass } from "@/components/kit";
import { LessonDetailSheet } from "@/components/lesson-detail";
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
import { cn } from "@/lib/utils";

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
  const [detail, setDetail] = useState<Lesson | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateLesson(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: qk.lessons });
      const previous = qc.getQueryData<Lesson[]>(qk.lessons);
      if (previous) {
        qc.setQueryData<Lesson[]>(
          qk.lessons,
          previous.map((l) => (l.id === id ? { ...l, status } : l)),
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(qk.lessons, context.previous);
      toast.error("Something went wrong.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.lessons });
    },
    onSuccess: () => {
      toast.success("Status updated.");
    },
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

  const openDetail = (lesson: Lesson) => {
    setDetail(lesson);
    setDetailOpen(true);
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((lesson) => {
            const studentName = lesson.student_id ? (nameOf.get(lesson.student_id) ?? "—") : "—";
            return (
              <Card key={lesson.id} className="shadow-soft">
                <CardContent className="flex flex-col gap-2.5 p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-foreground">
                      <BookOpen className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {lesson.title}
                      </h3>
                      {(lesson.subtitle || lesson.unit) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {lesson.subtitle ?? lesson.unit}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                              toneClass[statusTone(lesson.status)],
                            )}
                          >
                            {lesson.status}
                            <ChevronDown className="size-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          {LESSON_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => changeStatus.mutate({ id: lesson.id, status: s })}
                            >
                              <Check
                                className={cn(
                                  "size-3.5",
                                  lesson.status === s ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Options" className="size-7">
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

                  <div className="space-y-0.5">
                    <p className="truncate text-sm font-medium text-foreground">{studentName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[lesson.level, lesson.program].filter(Boolean).join(" • ") ||
                        "No level / program"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(lesson.date)}</p>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 border-t pt-2.5">
                    <Button size="sm" className="flex-1" onClick={() => openDetail(lesson)}>
                      <Eye className="size-3.5" /> View Detail
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Edit"
                      onClick={() => openEdit(lesson)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LessonDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lesson={detail}
        student={detail?.student_id ? studentOf.get(detail.student_id) : undefined}
        onEdit={(lesson) => {
          setDetailOpen(false);
          openEdit(lesson);
        }}
      />

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
