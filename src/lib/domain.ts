import type { Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students">;
export type Attendance = Tables<"attendance">;
export type Lesson = Tables<"lessons">;
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
export const ATTENDANCE_STATUSES = ["Present", "Late", "Excused", "Absent"] as const;
export const PROJECT_TYPES = [
  "Speaking",
  "Writing",
  "Reading",
  "Listening",
  "Presentation",
  "Video Project",
  "Vocabulary",
  "Grammar",
  "Other",
] as const;
export const PROJECT_STATUSES = [
  "Assigned",
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
    assigned: count("Assigned"),
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
  return new Date().toISOString().slice(0, 10);
}
