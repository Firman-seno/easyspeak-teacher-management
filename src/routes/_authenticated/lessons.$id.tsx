import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Link2,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, StatusBadge, statusTone } from "@/components/kit";
import { LessonFormDialog } from "@/components/lesson-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLessons, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/lessons/$id")({
  head: () => ({
    meta: [
      { title: "Lesson detail — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Lesson objectives, vocabulary, examples, assignment and teacher notes.",
      },
      { property: "og:title", content: "Lesson detail — EasySpeak Teacher Management" },
      { property: "og:description", content: "Review lesson objectives, materials and notes." },
    ],
  }),
  component: LessonDetail,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-foreground/90">
        <div className="whitespace-pre-line">{children}</div>
      </CardContent>
    </Card>
  );
}

function LessonDetail() {
  const qc = useQueryClient();
  const { id } = Route.useParams();
  const lessons = useLessons();
  const students = useStudents();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remove = useMutation({
    mutationFn: (lessonId: string) => api.deleteLesson(lessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.lessons });
      toast.success("Material successfully deleted.");
      setConfirmDelete(false);
    },
    onError: () => toast.error("Something went wrong."),
  });

  if (lessons.isLoading) return <p className="text-sm text-muted-foreground">Loading lesson…</p>;

  const lesson = (lessons.data ?? []).find((l) => l.id === id);
  const student = (students.data ?? []).find((s) => s.id === lesson?.student_id);

  if (!lesson) {
    return (
      <EmptyState
        title="Lesson not found."
        description="This lesson may have been removed."
        action={
          <Button asChild>
            <Link to="/lessons">Back to lessons</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/lessons">
          <ArrowLeft className="size-4" /> Back to lessons
        </Link>
      </Button>

      <Card className="shadow-soft">
        <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-6 sm:flex sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
              <BookOpen className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(lesson.status)}>{lesson.status}</StatusBadge>
                <StatusBadge tone="secondary">{lesson.level ?? "No level"}</StatusBadge>
                {lesson.program && <StatusBadge tone="accent">{lesson.program}</StatusBadge>}
              </div>
              <h1 className="mt-2 truncate text-xl font-semibold">{lesson.title}</h1>
              {lesson.subtitle && (
                <p className="mt-1 text-sm font-medium text-accent-foreground">{lesson.subtitle}</p>
              )}
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {lesson.topic ?? "General topic"} • {lesson.unit ?? "No unit"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit Material
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Date</p>
          <p className="mt-1 flex items-center gap-1.5 font-medium">
            <CalendarDays className="size-4 text-muted-foreground" />
            {formatDate(lesson.date)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Unit</p>
          <p className="mt-1 font-medium">{lesson.unit ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Student
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-medium">
            <UserRound className="size-4 text-muted-foreground" />
            <span className="truncate">{student?.name ?? "—"}</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Grammar focus
          </p>
          <p className="mt-1 font-medium">{lesson.grammar ?? "—"}</p>
        </div>
      </div>

      {student && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <GraduationCap className="size-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{student.name}</span>
          <span className="text-muted-foreground">
            {student.student_id} • {student.program} • Level {student.current_level}
          </span>
        </div>
      )}

      {lesson.success_indicator && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-emerald-700 uppercase">
            <CheckCircle2 className="size-4" /> Success Indicator
          </p>
          <p className="mt-1.5 text-sm text-emerald-900">{lesson.success_indicator}</p>
        </div>
      )}

      <Section title="Learning objective">{lesson.objective}</Section>

      <Section title="Lesson content">{lesson.content}</Section>

      <Section title="Vocabulary">
        {lesson.vocabulary ? (
          <div className="flex flex-wrap gap-2">
            {lesson.vocabulary.split(",").map((w) => (
              <span
                key={w}
                className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                {w.trim()}
              </span>
            ))}
          </div>
        ) : null}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Speaking practice">{lesson.speaking_practice}</Section>
        <Section title="Homework / Assignment">{lesson.homework}</Section>
      </div>

      <Section title="Teacher notes">{lesson.notes}</Section>

      <Section title="Attachment">
        {lesson.attachment ? (
          <a
            href={lesson.attachment}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-accent-foreground underline-offset-4 hover:underline"
          >
            <Link2 className="size-4" />
            {lesson.attachment}
          </a>
        ) : null}
      </Section>

      <LessonFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lesson={lesson}
        students={students.data ?? []}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this material?"
        description="This action cannot be undone."
        onConfirm={() => remove.mutate(lesson.id)}
      />
    </div>
  );
}
