import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, GraduationCap, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { StudentCombobox } from "@/components/entity-comboboxes";
import { ExistingContentDialog } from "@/components/existing-content-dialog";
import type { ExistingLessonContent } from "@/components/existing-content-dialog";
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
import { useAttendance } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { ASSESSMENT_SKILLS, ATTENDANCE_STATUSES, todayISO } from "@/lib/domain";
import type { AssessmentSkill, Lesson, Student } from "@/lib/domain";

const scoreSchema = z
  .string()
  .refine(
    (v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
    "Score must be a number between 0 and 100.",
  );

const durationSchema = z
  .string()
  .refine(
    (v) => v === "" || (/^\d{1,4}$/.test(v) && Number(v) > 0),
    "Duration must be a whole number greater than 0.",
  );

const schema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  title: z.string().trim().min(1, "Please enter lesson title.").max(200),
  subtitle: z.string().trim().max(200),
  successIndicator: z.string().trim().max(1000),
  duration: durationSchema,
  speakingScore: scoreSchema,
  listeningScore: scoreSchema,
  readingScore: scoreSchema,
  writingScore: scoreSchema,
  vocabularyScore: scoreSchema,
  date: z
    .string()
    .min(1, "Please choose a date.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
  meeting: z.string().trim().max(50),
  attendanceStatus: z.string(),
  attendanceTime: z.string(),
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
  successIndicator: "",
  duration: "",
  speakingScore: "",
  listeningScore: "",
  readingScore: "",
  writingScore: "",
  vocabularyScore: "",
  date: todayISO(),
  meeting: "",
  attendanceStatus: "",
  attendanceTime: "",
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
  const [existingOpen, setExistingOpen] = useState(false);
  const attendance = useAttendance();

  const presetStudent = useMemo(
    () => students.find((s) => s.id === presetStudentId),
    [students, presetStudentId],
  );

  const existingAttendance = useMemo(() => {
    if (!lesson) return null;
    return (attendance.data ?? []).find((a) => a.lesson_id === lesson.id) ?? null;
  }, [attendance.data, lesson]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (lesson) {
      setValues({
        studentId: lesson.student_id ?? "",
        title: lesson.title,
        subtitle: lesson.subtitle ?? "",
        successIndicator: lesson.success_indicator ?? "",
        duration: lesson.duration != null ? String(lesson.duration) : "",
        speakingScore: lesson.speaking_score != null ? String(lesson.speaking_score) : "",
        listeningScore: lesson.listening_score != null ? String(lesson.listening_score) : "",
        readingScore: lesson.reading_score != null ? String(lesson.reading_score) : "",
        writingScore: lesson.writing_score != null ? String(lesson.writing_score) : "",
        vocabularyScore: lesson.vocabulary_score != null ? String(lesson.vocabulary_score) : "",
        date: lesson.date.slice(0, 10),
        meeting: existingAttendance?.meeting ?? "",
        attendanceStatus: existingAttendance?.status ?? "",
        attendanceTime: existingAttendance?.check_in_time ?? "",
      });
    } else if (presetStudent) {
      setValues({ ...empty, studentId: presetStudent.id });
    } else {
      setValues(empty);
    }
  }, [open, lesson, presetStudent, existingAttendance]);

  const selectedStudent = students.find((s) => s.id === values.studentId);

  const set = (key: keyof FormValues, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const mutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const student = students.find((s) => s.id === payload.studentId);
      const lessonData = {
        student_id: payload.studentId,
        title: payload.title.trim(),
        subtitle: payload.subtitle.trim() || null,
        program: student?.program ?? null,
        level: student?.current_level ?? null,
        success_indicator: payload.successIndicator.trim() || null,
        duration: payload.duration === "" ? null : Number(payload.duration),
        speaking_score: payload.speakingScore === "" ? null : Number(payload.speakingScore),
        listening_score: payload.listeningScore === "" ? null : Number(payload.listeningScore),
        reading_score: payload.readingScore === "" ? null : Number(payload.readingScore),
        writing_score: payload.writingScore === "" ? null : Number(payload.writingScore),
        vocabulary_score: payload.vocabularyScore === "" ? null : Number(payload.vocabularyScore),
        date: payload.date,
      };

      let lessonId: string;

      if (lesson) {
        await api.updateLesson(lesson.id, lessonData);
        lessonId = lesson.id;
      } else {
        const created = await api.createLesson(lessonData);
        lessonId = created.id;
      }

      const hasAttendance =
        payload.meeting.trim() !== "" ||
        payload.attendanceStatus !== "" ||
        payload.attendanceTime !== "";

      if (hasAttendance) {
        await api.upsertAttendanceForLesson(
          lessonId,
          payload.studentId,
          payload.date,
          {
            meeting: payload.meeting.trim() || null,
            status: payload.attendanceStatus || "Present",
            check_in_time: payload.attendanceTime || null,
          },
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.lessons });
      qc.invalidateQueries({ queryKey: qk.attendance });
      toast.success(lesson ? "Material successfully updated." : "Material successfully added.");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      console.error("Failed to save lesson:", e);
      toast.error(`Failed to save the lesson. ${e.message}`);
    },
  });

  const useExistingContent = (content: ExistingLessonContent) => {
    setValues((v) => ({
      ...v,
      title: content.title,
      subtitle: content.subtitle,
      successIndicator: content.successIndicator,
      duration: content.duration != null ? String(content.duration) : v.duration,
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next["title"];
      delete next["subtitle"];
      delete next["successIndicator"];
      return next;
    });
  };

  const submit = () => {
    if (mutation.isPending) return;
    const student = students.find((s) => s.id === values.studentId);
    if (student && (!student.program || !student.current_level)) {
      const message =
        "This student does not have a program or level assigned. Please update the student's profile first.";
      setErrors({ program: message });
      toast.error(message);
      return;
    }
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

  return (
    <>
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
                onChange={(id) => setValues((v) => ({ ...v, studentId: id }))}
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

            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExistingOpen(true)}
                className="w-full justify-center gap-2"
              >
                <Search className="size-4" /> Use Existing Content
              </Button>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Reuse the Title, Subtitle, Success Indicator and Duration from a lesson you have
                already created. Duration is copied only when the source lesson has one.
              </p>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="lesson-title">Lesson Title *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExistingOpen(true)}
                  className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" /> Use Existing
                </Button>
              </div>
              <Input
                id="lesson-title"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Introducing about IELTS"
              />
              {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
            </div>

            <div className="sm:col-span-2">
              {field(
                "subtitle",
                "Subtitle",
                "text",
                "Optional. Enter a short subtitle, for example: Past simple.",
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Program *</Label>
              <Input
                value={selectedStudent?.program ?? ""}
                readOnly
                placeholder="Select a student first"
                className="cursor-default bg-muted/50"
              />
              {errors["program"] && <p className="text-xs text-destructive">{errors["program"]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Level *</Label>
              <Input
                value={selectedStudent?.current_level ?? ""}
                readOnly
                placeholder="Select a student first"
                className="cursor-default bg-muted/50"
              />
              {errors["level"] && <p className="text-xs text-destructive">{errors["level"]}</p>}
            </div>

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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lesson-duration">Duration (minutes)</Label>
              <Input
                id="lesson-duration"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="e.g. 60"
                value={values.duration}
                onChange={(e) => set("duration", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the estimated duration of this lesson in minutes.
              </p>
              {errors["duration"] && (
                <p className="text-xs text-destructive">{errors["duration"]}</p>
              )}
            </div>

            <div className="space-y-1.5">{field("date", "Date *", "date")}</div>

            <div className="space-y-3 rounded-lg border border-border bg-card p-3 sm:col-span-2">
              <div>
                <Label className="text-sm font-semibold">Attendance</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Optional. Record attendance for this lesson. Student, program and level are
                  automatically linked from the lesson data.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-meeting">Meeting</Label>
                  <Input
                    id="lesson-meeting"
                    value={values.meeting}
                    onChange={(e) => set("meeting", e.target.value)}
                    placeholder="e.g. Meeting 1"
                  />
                  {errors["meeting"] && (
                    <p className="text-xs text-destructive">{errors["meeting"]}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-attendance-status">Status</Label>
                  <Select
                    value={values.attendanceStatus}
                    onValueChange={(v) => set("attendanceStatus", v)}
                  >
                    <SelectTrigger id="lesson-attendance-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-attendance-time">Time</Label>
                  <Input
                    id="lesson-attendance-time"
                    type="time"
                    value={values.attendanceTime}
                    onChange={(e) => set("attendanceTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
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

      <ExistingContentDialog
        open={existingOpen}
        onOpenChange={setExistingOpen}
        program={selectedStudent?.program ?? null}
        level={selectedStudent?.current_level ?? null}
        excludeLessonId={lesson?.id ?? null}
        onUseContent={useExistingContent}
      />
    </>
  );
}
