import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type {
  Assignment,
  Attendance,
  Lesson,
  LevelRow,
  MonthlyReport,
  Progress,
  ProgressHistory,
  Project,
  Student,
} from "./domain";
import type { Tables } from "@/integrations/supabase/types";

type SettingsRow = Tables<"settings">;

export type LessonWithStudent = Lesson & { students: { name: string } | null };

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const api = {
  async students(): Promise<Student[]> {
    return unwrap(await supabase.from("students").select("*").order("name"));
  },
  async student(id: string): Promise<Student> {
    return unwrap(await supabase.from("students").select("*").eq("id", id).single());
  },
  async createStudent(values: TablesInsert<"students">): Promise<Student> {
    const student = unwrap(
      await supabase.from("students").insert(values).select().single(),
    ) as Student;
    const { error } = await supabase.from("progress").insert({ student_id: student.id });
    if (error) {
      await supabase.from("students").delete().eq("id", student.id);
      throw new Error(error.message);
    }
    return student;
  },

  async updateStudent(id: string, values: TablesUpdate<"students">) {
    return unwrap(await supabase.from("students").update(values).eq("id", id).select().single());
  },
  async deleteStudent(id: string) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async attendance(): Promise<Attendance[]> {
    return unwrap(
      await supabase.from("attendance").select("*").order("date", { ascending: false }).limit(2000),
    );
  },
  async upsertAttendance(rows: TablesInsert<"attendance">[]) {
    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" });
    if (error) throw new Error(error.message);
  },
  async updateAttendance(id: string, values: TablesUpdate<"attendance">) {
    const { error } = await supabase.from("attendance").update(values).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async deleteAttendance(id: string) {
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async lessons(): Promise<Lesson[]> {
    return unwrap(await supabase.from("lessons").select("*").order("date", { ascending: false }));
  },
  async createLesson(values: TablesInsert<"lessons">): Promise<Lesson> {
    return unwrap<Lesson>(await supabase.from("lessons").insert(values).select().single());
  },
  async updateLesson(id: string, values: TablesUpdate<"lessons">) {
    const { error } = await supabase.from("lessons").update(values).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async deleteLesson(id: string) {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
  async searchLessons(params: {
    q?: string;
    program?: string;
    level?: string;
    limit?: number;
    excludeLessonId?: string;
  }): Promise<LessonWithStudent[]> {
    let builder = supabase.from("lessons").select("*, students(name)");
    if (params.excludeLessonId) builder = builder.neq("id", params.excludeLessonId);
    if (params.program) builder = builder.eq("program", params.program);
    if (params.level) builder = builder.eq("level", params.level);
    const q = params.q?.trim();
    if (q) {
      // Values are wrapped in double quotes so commas, dots and parentheses in
      // the search text cannot break the PostgREST `or()` filter grammar.
      // Double quotes and backslashes are stripped for the same reason.
      const value = q.replace(/["\\]/g, " ");
      const pattern = `"*${value}*"`;
      builder = builder.or(
        `title.ilike.${pattern},subtitle.ilike.${pattern},success_indicator.ilike.${pattern}`,
      );
    }
    const { data, error } = await builder
      .order("date", { ascending: false })
      .limit(params.limit ?? 20);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as LessonWithStudent[];
  },

  async assignments(): Promise<Assignment[]> {
    return unwrap(
      await supabase.from("assignments").select("*").order("assigned_date", { ascending: false }),
    );
  },
  async createAssignment(values: TablesInsert<"assignments">): Promise<Assignment> {
    return unwrap<Assignment>(await supabase.from("assignments").insert(values).select().single());
  },
  async updateAssignment(id: string, values: TablesUpdate<"assignments">) {
    const { error } = await supabase.from("assignments").update(values).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async deleteAssignment(id: string) {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async projects(): Promise<Project[]> {
    return unwrap(
      await supabase.from("projects").select("*").order("assigned_date", { ascending: false }),
    );
  },
  async createProject(values: TablesInsert<"projects">): Promise<Project> {
    return unwrap<Project>(await supabase.from("projects").insert(values).select().single());
  },
  async updateProject(id: string, values: TablesUpdate<"projects">) {
    const { error } = await supabase.from("projects").update(values).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async deleteProject(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async progress(): Promise<Progress[]> {
    return unwrap(await supabase.from("progress").select("*"));
  },
  async saveProgress(studentId: string, values: TablesUpdate<"progress">) {
    const { error } = await supabase
      .from("progress")
      .upsert({ student_id: studentId, ...values }, { onConflict: "student_id" });
    if (error) throw new Error(error.message);
  },
  async progressHistory(studentId?: string): Promise<ProgressHistory[]> {
    let q = supabase
      .from("progress_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (studentId) q = q.eq("student_id", studentId);
    return unwrap(await q);
  },
  async addProgressHistory(rows: TablesInsert<"progress_history">[]) {
    if (!rows.length) return;
    const { error } = await supabase.from("progress_history").insert(rows);
    if (error) throw new Error(error.message);
  },

  async levels(): Promise<LevelRow[]> {
    return unwrap(await supabase.from("levels").select("*").order("order_number"));
  },

  async reports(): Promise<MonthlyReport[]> {
    return unwrap(
      await supabase.from("monthly_reports").select("*").order("created_at", { ascending: false }),
    );
  },
  async saveReport(values: TablesInsert<"monthly_reports">): Promise<MonthlyReport> {
    return unwrap<MonthlyReport>(
      await supabase.from("monthly_reports").insert(values).select().single(),
    );
  },
  async updateReport(id: string, values: TablesUpdate<"monthly_reports">) {
    const { error } = await supabase.from("monthly_reports").update(values).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async deleteReport(id: string) {
    const { error } = await supabase.from("monthly_reports").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async settings(): Promise<SettingsRow> {
    return unwrap(await supabase.from("settings").select("*").eq("id", 1).single());
  },
  async saveSettings(values: TablesUpdate<"settings">) {
    const { error } = await supabase.from("settings").update(values).eq("id", 1);
    if (error) throw new Error(error.message);
  },
};

export const qk = {
  students: ["students"] as const,
  student: (id: string) => ["students", id] as const,
  attendance: ["attendance"] as const,
  lessons: ["lessons"] as const,
  assignments: ["assignments"] as const,
  projects: ["projects"] as const,
  progress: ["progress"] as const,
  progressHistory: (id?: string) => ["progress_history", id ?? "all"] as const,
  levels: ["levels"] as const,
  reports: ["reports"] as const,
  settings: ["settings"] as const,
};
