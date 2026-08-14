import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { StudentCombobox } from "@/components/entity-comboboxes";
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
import { ASSESSMENT_SKILLS, LEVELS, PROGRAMS, todayISO } from "@/lib/domain";
import type { AssessmentSkill, Lesson, Student } from "@/lib/domain";

const scoreSchema = z
  .string()
  .refine(
    (v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
    "Score must be a number between 0 and 100.",
  );

const schema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  title: z.string().trim().min(1, "Please enter lesson title.").max(200),
  subtitle: z.string().trim().max(200),
  program: z.string().min(1, "Please choose a program."),
  level: z.string().min(1, "Please choose a level."),
  successIndicator: z.string().trim().max(1000),
  speakingScore: scoreSchema,
  listeningScore: scoreSchema,
  readingScore: scoreSchema,
  writingScore: scoreSchema,
  vocabularyScore: scoreSchema,
  assessmentNotes: z.string().trim().max(2000),
  date: z
    .string()
    .min(1, "Please choose a date.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
});

type FormValues = z.infer<typeof schema>;

const ASSESSMENT_LABELS: Record<AssessmentSkill, string> = {
  speaking: "Speaking",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  vocabulary: "Vocabulary",
};

const empty: FormValues = {
  studentId: "",
  title: "",
  subtitle: "",
  program: "",
  level: "",
  successIndicator: "",
  speakingScore: "",
  listeningScore: "",
  readingScore: "",
  writingScore: "",
  vocabularyScore: "",
  assessmentNotes: "",
  date: todayISO(),
};

export function LessonFormDialog({
  open,
  onOpenChange,
  lesson,
  students,
  presetStudentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: Lesson | null;
  students: Student[];
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
    if (lesson) {
      setValues({
        studentId: lesson.student_id ?? "",
        title: lesson.title,
        subtitle: lesson.subtitle ?? "",
        program: lesson.program ?? "",
        level: lesson.level ?? "",
        successIndicator: lesson.success_indicator ?? "",
        speakingScore: lesson.speaking_score != null ? String(lesson.speaking_score) : "",
        listeningScore: lesson.listening_score != null ? String(lesson.listening_score) : "",
        readingScore: lesson.reading_score != null ? String(lesson.reading_score) : "",
        writingScore: lesson.writing_score != null ? String(lesson.writing_score) : "",
        vocabularyScore: lesson.vocabulary_score != null ? String(lesson.vocabulary_score) : "",
        assessmentNotes: lesson.assessment_notes ?? "",
        date: lesson.date.slice(0, 10),
      });
    } else if (presetStudent) {
      setValues({
        ...empty,
        studentId: presetStudent.id,
        program: presetStudent.program,
        level: presetStudent.current_level,
      });
    } else {
      setValues(empty);
    }
  }, [open, lesson, presetStudent]);

  const selectedStudent = students.find((s) => s.id === values.studentId);

  const set = (key: keyof FormValues, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const mutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const data = {
        student_id: payload.studentId,
        title: payload.title.trim(),
        subtitle: payload.subtitle.trim() || null,
        program: payload.program,
        level: payload.level,
        success_indicator: payload.successIndicator.trim() || null,
        speaking_score: payload.speakingScore === "" ? null : Number(payload.speakingScore),
        listening_score: payload.listeningScore === "" ? null : Number(payload.listeningScore),
        reading_score: payload.readingScore === "" ? null : Number(payload.readingScore),
        writing_score: payload.writingScore === "" ? null : Number(payload.writingScore),
        vocabulary_score: payload.vocabularyScore === "" ? null : Number(payload.vocabularyScore),
        assessment_notes: payload.assessmentNotes.trim() || null,
        date: payload.date,
      };
      if (lesson) await api.updateLesson(lesson.id, data);
      else await api.createLesson(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.lessons });
      toast.success(lesson ? "Material successfully updated." : "Lesson saved successfully.");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      console.error("Failed to save lesson:", e);
      toast.error(`Failed to save the lesson. ${e.message}`);
    },
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

  const field = (key: keyof FormValues, label: string, type = "text", helper?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`lesson-${key}`}>{label}</Label>
      <Input
        id={`lesson-${key}`}
        type={type}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const textareaField = (key: keyof FormValues, label: string, helper?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`lesson-${key}`}>{label}</Label>
      <Textarea
        id={`lesson-${key}`}
        rows={3}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const scoreField = (key: keyof FormValues, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`lesson-${key}`}>{label}</Label>
      <Input
        id={`lesson-${key}`}
        type="number"
        min={0}
        max={100}
        inputMode="numeric"
        placeholder="—"
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit Material" : "Add New Material"}</DialogTitle>
          <DialogDescription>
            {lesson
              ? "Update the material details. Changes are saved to the database."
              : "Create a new lesson or material for a specific student."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Student *</Label>
            <StudentCombobox
              students={students}
              value={values.studentId}
              onChange={(id, student) =>
                setValues((v) => ({
                  ...v,
                  studentId: id,
                  program: student?.program ?? v.program,
                  level: student?.current_level ?? v.level,
                }))
              }
            />
            {selectedStudent ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="size-3.5" />
                {selectedStudent.student_id} • {selectedStudent.program} •{" "}
                {selectedStudent.current_level}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Program and level are filled automatically from the student.
              </p>
            )}
            {errors["studentId"] && (
              <p className="text-xs text-destructive">{errors["studentId"]}</p>
            )}
          </div>

          <div className="sm:col-span-2">{field("title", "Lesson Title *")}</div>

          <div className="sm:col-span-2">
            {field(
              "subtitle",
              "Subtitle",
              "text",
              "Optional. Enter a short subtitle, for example: Past simple.",
            )}
          </div>

          {selectField("program", "Program *", PROGRAMS)}
          {selectField("level", "Level *", LEVELS)}

          <div className="sm:col-span-2">
            {textareaField(
              "successIndicator",
              "Success Indicator",
              "Optional. Describe what the student should be able to do at the end of the lesson, for example: Students are able to use past simple to talk about their weekend.",
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-card p-3 sm:col-span-2">
            <div>
              <Label className="text-sm font-semibold">Skill Assessment</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Optional. Enter a score from 0 to 100 for each skill. Leave empty for skills that
                were not assessed in this lesson.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ASSESSMENT_SKILLS.map((skill) =>
                scoreField(
                  `${skill}Score` as keyof FormValues,
                  ASSESSMENT_LABELS[skill as AssessmentSkill],
                ),
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-assessmentNotes">Assessment Notes</Label>
              <Textarea
                id="lesson-assessmentNotes"
                rows={2}
                value={values.assessmentNotes}
                onChange={(e) => set("assessmentNotes", e.target.value)}
                placeholder="Optional note about this lesson's assessment, for example: Student was able to answer most speaking questions but still needs improvement in vocabulary."
              />
              {errors["assessmentNotes"] && (
                <p className="text-xs text-destructive">{errors["assessmentNotes"]}</p>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">{field("date", "Date *", "date")}</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : lesson ? "Save changes" : "Add Material"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
