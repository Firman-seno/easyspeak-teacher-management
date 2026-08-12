import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { LessonCombobox, StudentCombobox } from "@/components/entity-comboboxes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, qk } from "@/lib/api";
import { PROJECT_STATUSES, PROJECT_TYPES, todayISO } from "@/lib/domain";
import type { Lesson, Project, Student } from "@/lib/domain";

const schema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  title: z.string().trim().min(1, "Please enter project title.").max(200),
  type: z.string().min(1),
  description: z.string().trim().max(3000).optional(),
  objective: z.string().trim().max(3000).optional(),
  lessonId: z.string().optional(),
  startDate: z.string().min(1, "Please choose a start date."),
  dueDate: z.string().optional(),
  status: z.string().min(1),
  progress: z.string().optional(),
  submissionDate: z.string().optional(),
  score: z.string().optional(),
  teacherFeedback: z.string().trim().max(3000).optional(),
  teacherNotes: z.string().trim().max(2000).optional(),
  attachment: z.string().trim().max(500).optional(),
  submissionLink: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const empty: FormValues = {
  studentId: "",
  title: "",
  type: "Speaking Video Project",
  description: "",
  objective: "",
  lessonId: "",
  startDate: todayISO(),
  dueDate: "",
  status: "Planned",
  progress: "",
  submissionDate: "",
  score: "",
  teacherFeedback: "",
  teacherNotes: "",
  attachment: "",
  submissionLink: "",
};

function toNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  students,
  lessons,
  presetStudentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  students: Student[];
  lessons: Lesson[];
  presetStudentId?: string;
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<FormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const presetStudent = useMemo(
    () => students.find((s) => s.id === presetStudentId),
    [students, presetStudentId],
  );

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (project) {
      setValues({
        studentId: project.student_id,
        title: project.title,
        type: project.type,
        description: project.description ?? "",
        objective: project.objective ?? "",
        lessonId: project.lesson_id ?? "",
        startDate: project.assigned_date.slice(0, 10),
        dueDate: project.due_date?.slice(0, 10) ?? "",
        status: project.status,
        progress: project.progress === null || project.progress === undefined ? "" : String(project.progress),
        submissionDate: project.submission_date?.slice(0, 10) ?? "",
        score: project.score === null || project.score === undefined ? "" : String(project.score),
        teacherFeedback: project.feedback ?? "",
        teacherNotes: project.teacher_notes ?? "",
        attachment: project.attachment ?? "",
        submissionLink: project.submission_link ?? "",
      });
    } else if (presetStudent) {
      setValues({ ...empty, studentId: presetStudent.id });
    } else {
      setValues(empty);
    }
  }, [open, project, presetStudent]);

  const selectedStudent = students.find((s) => s.id === values.studentId);
  const studentLessons = useMemo(
    () => lessons.filter((l) => l.student_id === values.studentId),
    [lessons, values.studentId],
  );

  const set = (key: keyof FormValues, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const mutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const data = {
        student_id: payload.studentId,
        lesson_id: payload.lessonId || null,
        title: payload.title.trim(),
        type: payload.type,
        description: payload.description?.trim() || null,
        objective: payload.objective?.trim() || null,
        assigned_date: payload.startDate,
        due_date: payload.dueDate || null,
        status: payload.status,
        progress: toNumber(payload.progress) ?? 0,
        submission_date: payload.submissionDate || null,
        score: toNumber(payload.score),
        feedback: payload.teacherFeedback?.trim() || null,
        teacher_notes: payload.teacherNotes?.trim() || null,
        attachment: payload.attachment?.trim() || null,
        submission_link: payload.submissionLink?.trim() || null,
      };
      if (project) await api.updateProject(project.id, data);
      else await api.createProject(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
      toast.success(project ? "Project successfully updated." : "Project successfully added.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong."),
  });

  const submit = () => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    mutation.mutate(values);
  };

  const field = (key: keyof FormValues, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`project-${key}`}>{label}</Label>
      <Input
        id={`project-${key}`}
        type={type}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const textareaField = (key: keyof FormValues, label: string, rows = 3) => (
    <div className="space-y-1.5">
      <Label htmlFor={`project-${key}`}>{label}</Label>
      <Textarea
        id={`project-${key}`}
        rows={rows}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const selectField = (key: keyof FormValues, label: string, options: readonly string[]) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={values[key] ?? ""} onValueChange={(v) => set(key, v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update the project details. Changes are saved to the database."
              : "Create a new project, milestone or final assignment for a specific student."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Student *</Label>
            <StudentCombobox
              students={students}
              value={values.studentId}
              onChange={(id) => set("studentId", id)}
            />
            {selectedStudent && (
              <p className="text-xs text-muted-foreground">
                {selectedStudent.student_id} • {selectedStudent.program} •{" "}
                {selectedStudent.current_level}
              </p>
            )}
            {errors["studentId"] && (
              <p className="text-xs text-destructive">{errors["studentId"]}</p>
            )}
          </div>

          {field("title", "Project Title *")}
          {selectField("type", "Project Type", PROJECT_TYPES)}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Related Lesson / Material</Label>
            <LessonCombobox
              lessons={studentLessons}
              value={values.lessonId ?? ""}
              onChange={(id) => set("lessonId", id)}
            />
          </div>

          {field("startDate", "Start Date *", "date")}
          {field("dueDate", "Due Date", "date")}

          {selectField("status", "Status", PROJECT_STATUSES)}
          {field("progress", "Progress % (0–100)", "number")}

          {field("submissionDate", "Submission Date", "date")}
          {field("score", "Score (0–100)", "number")}

          <div className="sm:col-span-2">
            {textareaField("description", "Description", 3)}
          </div>
          <div className="sm:col-span-2">
            {textareaField("objective", "Objective", 3)}
          </div>

          {field("attachment", "Attachment / File (URL)")}
          {field("submissionLink", "Submission Link (URL)")}

          <div className="sm:col-span-2">
            {textareaField("teacherFeedback", "Teacher Feedback", 4)}
          </div>
          <div className="sm:col-span-2">
            {textareaField("teacherNotes", "Teacher Notes", 3)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {project ? "Save changes" : "Add Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
