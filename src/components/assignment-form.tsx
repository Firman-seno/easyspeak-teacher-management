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
import { ASSIGNMENT_STATUSES, ASSIGNMENT_TYPES, todayISO } from "@/lib/domain";
import type { Assignment, Lesson, Student } from "@/lib/domain";

const schema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  title: z.string().trim().min(1, "Please enter assignment title.").max(200),
  type: z.string().min(1),
  description: z.string().trim().max(3000).optional(),
  instructions: z.string().trim().max(3000).optional(),
  lessonId: z.string().optional(),
  assignedDate: z.string().min(1, "Please choose an assigned date."),
  dueDate: z.string().optional(),
  status: z.string().min(1),
  score: z.string().optional(),
  maxScore: z.string().optional(),
  teacherNotes: z.string().trim().max(2000).optional(),
  attachment: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const empty: FormValues = {
  studentId: "",
  title: "",
  type: "Homework",
  description: "",
  instructions: "",
  lessonId: "",
  assignedDate: todayISO(),
  dueDate: "",
  status: "Assigned",
  score: "",
  maxScore: "",
  teacherNotes: "",
  attachment: "",
};

function toScore(value: string | undefined, maxValue: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  const max = maxValue ? Math.round(Number(maxValue)) : null;
  if (max !== null && Number.isFinite(max) && max > 0) {
    return Math.min(max, Math.max(0, n));
  }
  return Math.max(0, n);
}

function toMaxScore(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function AssignmentFormDialog({
  open,
  onOpenChange,
  assignment,
  students,
  lessons,
  presetStudentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: Assignment | null;
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
    if (assignment) {
      setValues({
        studentId: assignment.student_id,
        title: assignment.title,
        type: assignment.type,
        description: assignment.description ?? "",
        instructions: assignment.instructions ?? "",
        lessonId: assignment.lesson_id ?? "",
        assignedDate: assignment.assigned_date.slice(0, 10),
        dueDate: assignment.due_date?.slice(0, 10) ?? "",
        status: assignment.status,
        score:
          assignment.score === null || assignment.score === undefined
            ? ""
            : String(assignment.score),
        maxScore:
          assignment.max_score === null || assignment.max_score === undefined
            ? ""
            : String(assignment.max_score),
        teacherNotes: assignment.teacher_notes ?? "",
        attachment: assignment.attachment ?? "",
      });
    } else if (presetStudent) {
      setValues({ ...empty, studentId: presetStudent.id });
    } else {
      setValues(empty);
    }
  }, [open, assignment, presetStudent]);

  const selectedStudent = students.find((s) => s.id === values.studentId);
  const studentLessons = useMemo(
    () => lessons.filter((l) => l.student_id === values.studentId),
    [lessons, values.studentId],
  );

  const set = (key: keyof FormValues, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const mutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const data = {
        student_id: payload.studentId,
        lesson_id: payload.lessonId || null,
        title: payload.title.trim(),
        type: payload.type,
        description: payload.description?.trim() || null,
        instructions: payload.instructions?.trim() || null,
        assigned_date: payload.assignedDate,
        due_date: payload.dueDate || null,
        status: payload.status,
        score: toScore(payload.score, payload.maxScore),
        max_score: toMaxScore(payload.maxScore),
        teacher_notes: payload.teacherNotes?.trim() || null,
        attachment: payload.attachment?.trim() || null,
      };
      if (assignment) await api.updateAssignment(assignment.id, data);
      else await api.createAssignment(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.assignments });
      toast.success(
        assignment ? "Assignment successfully updated." : "Assignment successfully added.",
      );
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
      <Label htmlFor={`assignment-${key}`}>{label}</Label>
      <Input
        id={`assignment-${key}`}
        type={type}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const textareaField = (key: keyof FormValues, label: string, rows = 3) => (
    <div className="space-y-1.5">
      <Label htmlFor={`assignment-${key}`}>{label}</Label>
      <Textarea
        id={`assignment-${key}`}
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
          <DialogTitle>{assignment ? "Edit Assignment" : "Add New Assignment"}</DialogTitle>
          <DialogDescription>
            {assignment
              ? "Update the assignment details. Changes are saved to the database."
              : "Create a new learning task for a specific student."}
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

          {field("title", "Assignment Title *")}
          {selectField("type", "Assignment Type", ASSIGNMENT_TYPES)}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Related Lesson / Material</Label>
            <LessonCombobox
              lessons={studentLessons}
              value={values.lessonId ?? ""}
              onChange={(id) => set("lessonId", id)}
            />
          </div>

          {field("assignedDate", "Assigned Date *", "date")}
          {field("dueDate", "Due Date", "date")}

          {selectField("status", "Status", ASSIGNMENT_STATUSES)}
          {field("attachment", "Attachment / File (URL)")}

          <div className="sm:col-span-2">{textareaField("description", "Description", 3)}</div>
          <div className="sm:col-span-2">{textareaField("instructions", "Instructions", 4)}</div>

          {field("score", "Score", "number")}
          {field("maxScore", "Max Score", "number")}

          <div className="sm:col-span-2">{textareaField("teacherNotes", "Teacher Notes", 3)}</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {assignment ? "Save changes" : "Add Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
