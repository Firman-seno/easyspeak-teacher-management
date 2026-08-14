import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FolderKanban, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, ProgressBar, StatusBadge, statusTone } from "@/components/kit";
import { ProjectFormDialog } from "@/components/project-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLessons, useProjects, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { effectiveProjectStatus, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project detail — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Project description, objective, deadline, submission status, feedback and score.",
      },
      { property: "og:title", content: "Project detail — EasySpeak Teacher Management" },
      { property: "og:description", content: "Review project details, submission and grading." },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const projects = useProjects();
  const students = useStudents();
  const lessons = useLessons();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const project = useMemo(
    () => (projects.data ?? []).find((p) => p.id === id),
    [projects.data, id],
  );

  const student = useMemo(
    () => (students.data ?? []).find((s) => s.id === project?.student_id),
    [students.data, project?.student_id],
  );

  const lesson = useMemo(
    () => (lessons.data ?? []).find((l) => l.id === project?.lesson_id),
    [lessons.data, project?.lesson_id],
  );

  const remove = useMutation({
    mutationFn: () => api.deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
      toast.success("Project successfully deleted.");
      setConfirmOpen(false);
      navigate({ to: "/projects" });
    },
    onError: () => toast.error("Something went wrong."),
  });

  if (projects.isLoading) return <p className="text-sm text-muted-foreground">Loading project…</p>;

  if (!project) {
    return (
      <EmptyState
        title="Project not found."
        description="This project may have been removed."
        action={
          <Button asChild>
            <Link to="/projects">Back to projects</Link>
          </Button>
        }
      />
    );
  }

  const statusValue = effectiveProjectStatus(project.status, project.due_date);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/projects">
          <ArrowLeft className="size-4" /> Back to projects
        </Link>
      </Button>

      <Card className="shadow-soft">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
              <FolderKanban className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(statusValue)}>{statusValue}</StatusBadge>
                <StatusBadge tone="secondary">{project.type}</StatusBadge>
              </div>
              <h1 className="mt-2 truncate text-xl font-semibold">{project.title}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {student?.name ?? "—"} • {student?.program ?? "No program"} •{" "}
                {student?.current_level ?? "No level"}
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
            Start date
          </p>
          <p className="mt-1 font-medium">{formatDate(project.assigned_date)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Deadline
          </p>
          <p className="mt-1 font-medium">{formatDate(project.due_date)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Submission
          </p>
          <p className="mt-1 font-medium">
            {project.submission_date ? formatDate(project.submission_date) : "Not submitted"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Score</p>
          <p className="mt-1 font-medium">{project.score ?? "Not graded"}</p>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-semibold">{project.progress}%</span>
          </div>
          <ProgressBar
            value={project.progress}
            tone={
              statusValue === "Completed"
                ? "success"
                : statusValue === "Overdue"
                  ? "danger"
                  : "secondary"
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line text-foreground/90">
            {project.description ? (
              <p>{project.description}</p>
            ) : (
              <p className="text-muted-foreground">No description provided.</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Objective</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line text-foreground/90">
            {project.objective ? (
              <p>{project.objective}</p>
            ) : (
              <p className="text-muted-foreground">No objective provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {project.instructions && (
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line text-foreground/90">
            <p>{project.instructions}</p>
          </CardContent>
        </Card>
      )}

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
              Attachment
            </p>
            <p className="mt-1">
              {project.attachment ? (
                <a
                  href={project.attachment}
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
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Submission link
            </p>
            <p className="mt-1">
              {project.submission_link ? (
                <a
                  href={project.submission_link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Open submission
                </a>
              ) : (
                "None"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Completed
            </p>
            <p className="mt-1 font-medium">
              {project.completed_date ? formatDate(project.completed_date) : "Not completed"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Teacher feedback
            </p>
            <p className="mt-1 text-sm whitespace-pre-line text-foreground/90">
              {project.feedback || "No feedback provided."}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Teacher notes
            </p>
            <p className="mt-1 text-sm whitespace-pre-line text-foreground/90">
              {project.teacher_notes || "No notes provided."}
            </p>
          </div>
        </CardContent>
      </Card>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        students={students.data ?? []}
        lessons={lessons.data ?? []}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Project?"
        description="This action cannot be undone."
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
