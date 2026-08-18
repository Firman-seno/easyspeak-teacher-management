import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Link2,
  Pencil,
  UserRound,
} from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { StatusBadge, statusTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAttendance } from "@/hooks/use-data";
import { ASSESSMENT_SKILLS, formatDate, formatDuration } from "@/lib/domain";
import type { AssessmentSkill, Lesson, Student } from "@/lib/domain";

const ASSESSMENT_LABELS: Record<AssessmentSkill, string> = {
  speaking: "Speaking",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  vocabulary: "Vocabulary",
};

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children?: ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="mt-1.5 text-sm whitespace-pre-line text-foreground/90">{children}</div>
    </div>
  );
}

export function LessonDetailSheet({
  open,
  onOpenChange,
  lesson,
  student,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  student?: Student | undefined;
  onEdit?: (lesson: Lesson) => void;
}) {
  const attendance = useAttendance();
  const existingAttendance = useMemo(
    () => (lesson ? (attendance.data ?? []).find((a) => a.lesson_id === lesson.id) ?? null : null),
    [attendance.data, lesson],
  );

  const hasAssessment = lesson
    ? !ASSESSMENT_SKILLS.every((s) => lesson[`${s}_score`] == null)
    : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b px-5 py-4 pr-12">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge tone={statusTone(lesson?.status ?? "")}>
                {lesson?.status ?? "—"}
              </StatusBadge>
              {lesson?.level && <StatusBadge tone="secondary">{lesson.level}</StatusBadge>}
              {lesson?.program && <StatusBadge tone="accent">{lesson.program}</StatusBadge>}
            </div>
            <h2 className="mt-2.5 text-lg font-semibold text-foreground">{lesson?.title}</h2>
            {lesson?.subtitle && (
              <p className="mt-0.5 text-sm font-medium text-accent-foreground">{lesson.subtitle}</p>
            )}
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {lesson?.topic ?? "General topic"} • {lesson?.unit ?? "No unit"}
            </p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Meta
                icon={<CalendarDays className="size-4" />}
                label="Date"
                value={lesson ? formatDate(lesson.date) : undefined}
              />
              <Meta
                icon={<UserRound className="size-4" />}
                label="Student"
                value={student?.name ?? "—"}
              />
              <Meta
                icon={<GraduationCap className="size-4" />}
                label="Level"
                value={lesson?.level ?? "—"}
              />
              <Meta
                icon={<BookOpen className="size-4" />}
                label="Program"
                value={lesson?.program ?? "—"}
              />
              <Meta
                icon={<UserRound className="size-4" />}
                label="Teacher"
                value={student?.teacher ?? "—"}
              />
              <Meta
                icon={<Clock className="size-4" />}
                label="Duration"
                value={formatDuration(lesson?.duration) ?? undefined}
              />
            </div>

            {existingAttendance && (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <ClipboardCheck className="size-4" /> Attendance
                </p>
                <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Meeting</p>
                    <p className="font-medium">{existingAttendance.meeting ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <StatusBadge tone={statusTone(existingAttendance.status)}>
                      {existingAttendance.status}
                    </StatusBadge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium">{existingAttendance.check_in_time ?? "—"}</p>
                  </div>
                </div>
              </div>
            )}
            {!existingAttendance && lesson && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Attendance
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Not recorded</p>
              </div>
            )}

            {lesson?.success_indicator && (
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-emerald-700 uppercase">
                  <CheckCircle2 className="size-4" /> Success Indicator
                </p>
                <p className="mt-1.5 text-sm text-emerald-900">{lesson.success_indicator}</p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <ClipboardCheck className="size-4" /> Skill Assessment
              </p>
              {!lesson || !hasAssessment ? (
                <p className="mt-1.5 text-sm text-muted-foreground">No assessment recorded.</p>
              ) : (
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ASSESSMENT_SKILLS.map((skill) => {
                    const score = lesson[`${skill}_score`];
                    return (
                      <div key={skill} className="rounded-lg bg-muted/60 px-2.5 py-2">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                          {ASSESSMENT_LABELS[skill]}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {score != null ? score : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DetailSection title="Learning objective">{lesson?.objective}</DetailSection>

            <DetailSection title="Lesson content">{lesson?.content}</DetailSection>

            {lesson?.vocabulary?.trim() && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Vocabulary
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {lesson.vocabulary
                    .split(",")
                    .map((w) => w.trim())
                    .filter(Boolean)
                    .map((w) => (
                      <span
                        key={w}
                        className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium"
                      >
                        {w}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailSection title="Speaking practice">{lesson?.speaking_practice}</DetailSection>
              <DetailSection title="Homework / Assignment">{lesson?.homework}</DetailSection>
            </div>

            <DetailSection title="Teacher notes">{lesson?.notes}</DetailSection>

            {lesson?.attachment && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Attachment
                </p>
                <a
                  href={lesson.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate text-sm text-accent-foreground underline-offset-4 hover:underline"
                >
                  <Link2 className="size-4 shrink-0" />
                  <span className="truncate">{lesson.attachment}</span>
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-5 py-3.5">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {lesson && onEdit && (
              <Button onClick={() => onEdit(lesson)}>
                <Pencil className="size-4" /> Edit Material
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
