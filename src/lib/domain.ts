import type { Json, Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students">;
export type Attendance = Tables<"attendance">;
export type Lesson = Tables<"lessons">;
export type Assignment = Tables<"assignments">;
export type Project = Tables<"projects">;
export type Progress = Tables<"progress">;
export type ProgressHistory = Tables<"progress_history">;
export type MonthlyReport = Tables<"monthly_reports">;
export type LevelRow = Tables<"levels">;

export const LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const PROGRAMS = [
  "General English",
  "Conversation Class",
  "Business English",
  "IELTS Preparation",
  "Kids English",
] as const;
export const STUDENT_STATUSES = ["Active", "Inactive", "Completed", "Suspended"] as const;
export const LESSON_STATUSES = ["Planned", "Complete"] as const;
export const ATTENDANCE_STATUSES = ["Present", "Late", "Excused", "Absent"] as const;
export const ASSIGNMENT_TYPES = [
  "Vocabulary Quiz",
  "Grammar Exercise",
  "Reading Task",
  "Writing Task",
  "Speaking Practice",
  "Listening Practice",
  "Homework",
  "Worksheet",
  "Mini Test",
  "Other",
] as const;
export const ASSIGNMENT_STATUSES = [
  "Assigned",
  "In Progress",
  "Submitted",
  "Reviewed",
  "Completed",
  "Overdue",
] as const;
export const PROJECT_TYPES = [
  "Speaking Video Project",
  "Final Presentation",
  "English Portfolio",
  "Roleplay Project",
  "Group Project",
  "Final Speaking Project",
  "Monthly English Project",
  "Video Project",
  "Presentation",
  "Other",
] as const;
export const PROJECT_STATUSES = [
  "Planned",
  "In Progress",
  "Submitted",
  "Reviewed",
  "Completed",
  "Overdue",
] as const;
export const SKILLS = [
  "speaking",
  "listening",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
] as const;
export type Skill = (typeof SKILLS)[number];

// The 5 skills used by Lessons/Materials assessments and the
// Monthly Reports assessment. Grammar is intentionally absent.
export const ASSESSMENT_SKILLS = [
  "speaking",
  "listening",
  "reading",
  "writing",
  "vocabulary",
] as const;
export type AssessmentSkill = (typeof ASSESSMENT_SKILLS)[number];
export type AssessmentScoreKey = `${AssessmentSkill}_score`;

export type SkillAssessmentValue = {
  total: number | null;
  final_score: number | null;
  percentage: number | null;
};

export type MonthlyAssessment = {
  speaking: SkillAssessmentValue;
  listening: SkillAssessmentValue;
  reading: SkillAssessmentValue;
  writing: SkillAssessmentValue;
  vocabulary: SkillAssessmentValue;
  overall: { monthly_score: number | null; percentage: number | null };
};

export function assessmentScoreKey(skill: AssessmentSkill): AssessmentScoreKey {
  return `${skill}_score`;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

// Reads the manual monthly assessment JSON stored on monthly_reports.
// Returns null for legacy reports that predate the Skill Assessment feature.
export function parseMonthlyAssessment(value: Json | null): MonthlyAssessment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const pick = (key: string): SkillAssessmentValue => {
    const s = v[key];
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      return { total: null, final_score: null, percentage: null };
    }
    const r = s as Record<string, unknown>;
    return {
      total: numberOrNull(r["total"]),
      final_score: numberOrNull(r["final_score"]),
      percentage: numberOrNull(r["percentage"]),
    };
  };
  const overall = v["overall"];
  const o =
    overall && typeof overall === "object" && !Array.isArray(overall)
      ? (overall as Record<string, unknown>)
      : undefined;
  return {
    speaking: pick("speaking"),
    listening: pick("listening"),
    reading: pick("reading"),
    writing: pick("writing"),
    vocabulary: pick("vocabulary"),
    overall: {
      monthly_score: o ? numberOrNull(o["monthly_score"]) : null,
      percentage: o ? numberOrNull(o["percentage"]) : null,
    },
  };
}

export type SkillAssessmentCalculation = {
  total: number;
  final_score: number;
  percentage: number;
  assessedCount: number;
};

// Computes the automatic monthly totals / final score / percentage for a
// skill from its lesson scores. NULL or missing scores are treated as
// "Not Assessed" and are never counted as 0. Returns null when no score
// exists at all.
export function calculateSkillAssessment(
  scores: Array<number | null | undefined>,
): SkillAssessmentCalculation | null {
  const assessed = scores.filter((s): s is number => typeof s === "number");
  if (assessed.length === 0) return null;
  const total = assessed.reduce((a, b) => a + b, 0);
  const final_score = total / assessed.length;
  return { total, final_score, percentage: final_score, assessedCount: assessed.length };
}

// Formats a score while preserving meaningful decimals (e.g. 70, 70.5, 73.33).
export function formatScore(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

// Builds the monthly_assessment JSON for a report from the month's lesson
// scores. Final score / percentage equal the average because scores already
// use the 0-100 scale.
export function buildMonthlyAssessment(lessons: Lesson[]): MonthlyAssessment {
  const row = (key: AssessmentScoreKey): SkillAssessmentValue => {
    const calc = calculateSkillAssessment(lessons.map((l) => l[key]));
    return {
      total: calc ? calc.total : null,
      final_score: calc ? calc.final_score : null,
      percentage: calc ? calc.percentage : null,
    };
  };
  return {
    speaking: row("speaking_score"),
    listening: row("listening_score"),
    reading: row("reading_score"),
    writing: row("writing_score"),
    vocabulary: row("vocabulary_score"),
    overall: { monthly_score: null, percentage: null },
  };
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function overallProgress(p: Partial<Record<Skill, number>>): number {
  const values = SKILLS.map((s) => p[s] ?? 0);
  return Math.round(values.reduce((a, b) => a + b, 0) / SKILLS.length);
}

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  rate: number;
};

export function summarizeAttendance(records: Pick<Attendance, "status">[]): AttendanceSummary {
  const total = records.length;
  const count = (s: string) => records.filter((r) => r.status === s).length;
  const present = count("Present");
  const late = count("Late");
  return {
    total,
    present,
    late,
    excused: count("Excused"),
    absent: count("Absent"),
    rate: total === 0 ? 0 : Math.round(((present + late) / total) * 100),
  };
}

export function attendanceLabel(rate: number) {
  if (rate >= 90) return { label: "Excellent", tone: "success" as const };
  if (rate >= 80) return { label: "Good", tone: "secondary" as const };
  if (rate >= 70) return { label: "Needs Attention", tone: "warning" as const };
  return { label: "Poor", tone: "danger" as const };
}

export function nextLevel(level: string): string | null {
  const i = LEVELS.indexOf(level as (typeof LEVELS)[number]);
  if (i < 0 || i === LEVELS.length - 1) return null;
  return LEVELS[i + 1]!;
}

export function projectStats(projects: Pick<Project, "status">[]) {
  const count = (s: string) => projects.filter((p) => p.status === s).length;
  const completed = count("Completed");
  return {
    total: projects.length,
    planned: count("Planned"),
    inProgress: count("In Progress"),
    submitted: count("Submitted"),
    reviewed: count("Reviewed"),
    overdue: count("Overdue"),
    completed,
    completionRate: projects.length ? Math.round((completed / projects.length) * 100) : 0,
  };
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function effectiveAssignmentStatus(status: string, dueDate?: string | null): string {
  if ((status === "Assigned" || status === "In Progress") && dueDate && dueDate < todayISO()) {
    return "Overdue";
  }
  return status;
}

export function effectiveProjectStatus(status: string, dueDate?: string | null): string {
  if ((status === "Planned" || status === "In Progress") && dueDate && dueDate < todayISO()) {
    return "Overdue";
  }
  return status;
}
