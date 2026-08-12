import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AssignmentFormDialog } from "@/components/assignment-form";
import { ConfirmDialog, EmptyState, StatusBadge, statusTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssignments, useLessons, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { effectiveAssignmentStatus, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/assignments/$id")({
  head: () => ({
    meta: [
      { title: "Assignment detail — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Assignment instructions, deadline, submission status, feedback and score.",
      },
      { property: "og:title", content: "Assignment detail — EasySpeak Teacher Management" },
      { property: "og:description", content: "Review assignment details and grading." },
    ],
  }),
  component: AssignmentDetail,
});

function AssignmentDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const assignments = useAssignments();
  const students = useStudents();
  const lessons = useLessons();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const assignment = useMemo(
    () => (assignments.data ?? []).find((a) => a.id === id),
    [assignments.data, id],
  );

  const student = useMemo(
    () => (students.data ?? []).find((s) => s.id === assignment?.student_id),
    [students.data, assignment?.student_id],
  );

  const lesson = useMemo(
    () => (lessons.data ?? []).find((l) => l.id === assignment?.lesson_id),
    [lessons.data, assignment?.lesson_id],
  );

  const remove = useMutation({
    mutationFn: () => api.deleteAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.assignments });
      toast.success("Assignment successfully deleted.");
      setConfirmOpen(false);
    },
    onError: () => toast.error("Something went wrong."),
  });

  if (assignments.isLoading) return <p className="text-sm text-muted-foreground">Loading assignment…</p>;

  if (!assignment) {
    return (
      <EmptyState
        title="Assignment not found."
        description="This assignment may have been removed."
        action={
          <Button asChild>
            <Link to="/assignments">Back to assignments</Link>
          </Button>
        }
      />
    );
  }

  const statusValue = effectiveAssignmentStatus(assignment.status, assignment.due_date);
  const scoreText =
    assignment.score === null || assignment.score === undefined
      ? "Not graded"
      : assignment.max_score
        ? `${assignment.score}/${assignment.max_score}`
        : String(assignment.score);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/assignments">
          <ArrowLeft className="size-4" /> Back to assignments
        </Link>
      </Button>

      <Card className="shadow-soft">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
              <ClipboardList className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(statusValue)}>{statusValue}</StatusBadge>
                <StatusBadge tone="secondary">{assignment.type}</StatusBadge>
              </div>
              <h1 className="mt-2 truncate text-xl font-semibold">{assignment.title}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {student?.name ?? "—"} • {student?.student_id ?? ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Student
          </p>
          <p className="mt-1 font-medium">{student?.name ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Assigned
          </p>
          <p className="mt-1 font-medium">{formatDate(assignment.assigned_date)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Due</p>
          <p className="mt-1 font-medium">{formatDate(assignment.due_date)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Score</p>
          <p className="mt-1 font-medium">{scoreText}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line text-foreground/90">
            {assignment.description ? (
              <p>{assignment.description}</p>
            ) : (
              <p className="text-muted-foreground">No description provided.</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line text-foreground/90">
            {assignment.instructions ? (
              <p>{assignment.instructions}</p>
            ) : (
              <p className="text-muted-foreground">No instructions provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Related lesson / material
            </p>
            <p className="mt-1 font-medium">
              {lesson ? (
                <Link
                  to="/lessons/$id"
                  params={{ id: lesson.id }}
                  className="text-primary hover:underline"
                >
                  {lesson.title}
                </Link>
              ) : (
                "None"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Program
            </p>
            <p className="mt-1 font-medium">{student?.program ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Level
            </p>
            <p className="mt-1 font-medium">{student?.current_level ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Attachment
            </p>
            <p className="mt-1">
              {assignment.attachment ? (
                <a
                  href={assignment.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Open attachment
                </a>
              ) : (
                "None"
              )}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Teacher notes
            </p>
            <p className="mt-1 text-sm whitespace-pre-line text-foreground/90">
              {assignment.teacher_notes || "No notes provided."}
            </p>
          </div>
        </CardContent>
      </Card>

      <AssignmentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        assignment={assignment}
        students={students.data ?? []}
        lessons={lessons.data ?? []}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Assignment?"
        description="This action cannot be undone."
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
