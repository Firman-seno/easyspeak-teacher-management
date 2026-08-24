import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type {
  Assignment,
  Attendance,
  Enrollment,
  Lesson,
  LevelRow,
  MonthlyReport,
  Progress,
  ProgressHistory,
  Program,
  Project,
  Student,
  Teacher,
} from "./domain";
import type { Tables } from "@/integrations/supabase/types";

type SettingsRow = Tables<"settings">;

export type LessonWithStudent = Lesson & { students: { name: string } | null };

export type AttendanceWithLesson = Attendance & {
  lessons: { title: string; date: string; student_id: string | null } | null;
};

export type EnrollmentWithProgram = Enrollment & { programs: { name: string } | null };

// ---------------------------------------------------------------------------
// Database error translation. Raw Postgres/PostgREST errors must never reach
// the UI; they are mapped to friendly, actionable messages here.
// ---------------------------------------------------------------------------
type DbErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

function errorText(error: unknown): string {
  if (!error) return "";
  const e = error as DbErrorLike;
  return [e.message, e.details, e.hint].filter(Boolean).join(" ");
}

function extractConstraint(error: unknown): string | null {
  return /constraint\s+"([^"]+)"/i.exec(errorText(error))?.[1] ?? null;
}

export function isUniqueViolation(error: unknown): boolean {
  const e = error as DbErrorLike;
  return (
    e?.code === "23505" ||
    /duplicate key|unique constraint/i.test(errorText(error)) ||
    /unique_violation/i.test(String(e?.code ?? ""))
  );
}

export function friendlyDbError(error: unknown, studentCode?: string): Error {
  const text = errorText(error);
  if (
    !text.trim() ||
    /failed to fetch|networkerror|network error|load failed|fetch failed/i.test(text)
  ) {
    return new Error("Network error. Please check your connection and try again.");
  }
  const constraint = extractConstraint(error);
  if (isUniqueViolation(error)) {
    if (constraint === "enrollments_unique_student_program_teacher") {
      return new Error("Student is already enrolled in this course.");
    }
    return new Error(
      studentCode
        ? `Student ID ${studentCode} is already registered. Please enter a different Student ID.`
        : "Student ID already exists. Please use a different Student ID.",
    );
  }
  if ((error as DbErrorLike)?.code === "23503" || /foreign key/i.test(text)) {
    return new Error("A related record is missing or invalid. Please refresh and try again.");
  }
  if (
    (error as DbErrorLike)?.code === "42501" ||
    /row-level security|permission denied/i.test(text)
  ) {
    return new Error("You do not have permission to perform this action.");
  }
  if (/invalid input syntax for type (date|timestamp)/i.test(text)) {
    return new Error("Please enter a valid date.");
  }
  if (/invalid (email|mail) address|invalid input syntax for type uuid/i.test(text)) {
    return new Error("Please enter a valid value for the highlighted fields.");
  }
  // Unknown database error: log for debugging, show something human.
  console.error("[EasySpeak] Database error:", error);
  return new Error("Something went wrong while saving. Please try again.");
}

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

  // Returns the existing student that already owns this Student ID code, or
  // null when the code is free. `excludeStudentId` makes the check ignore a
  // specific row (used while editing so keeping your own ID is allowed).
  async studentByCode(code: string, excludeStudentId?: string): Promise<Student | null> {
    let q = supabase.from("students").select("*").eq("student_id", code.trim());
    if (excludeStudentId) q = q.neq("id", excludeStudentId);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw friendlyDbError(error);
    return (data as Student | null) ?? null;
  },

  // Suggests the next free Student ID. Continues the numeric sequence when
  // numeric codes are in use ("011" -> "012"), otherwise falls back to the
  // "STU-0001" format. Always verified against existing rows before use.
  async nextStudentId(): Promise<string> {
    const { data, error } = await supabase.from("students").select("student_id");
    if (error) throw friendlyDbError(error);
    const ids = (data ?? []).map((r) => r.student_id.trim());
    const taken = new Set(ids.map((i) => i.toLowerCase()));

    const numericIds = ids.filter((i) => /^\d+$/.test(i));
    if (numericIds.length > 0) {
      const width = Math.max(3, ...numericIds.map((i) => i.length));
      let n = Math.max(...numericIds.map((i) => parseInt(i, 10))) + 1;
      let candidate = String(n).padStart(width, "0");
      while (taken.has(candidate.toLowerCase())) {
        n += 1;
        candidate = String(n).padStart(width, "0");
      }
      return candidate;
    }

    const maxEmbedded = ids.reduce((max, id) => {
      const m = /(\d+)$/.exec(id);
      return m ? Math.max(max, parseInt(m[1]!, 10)) : max;
    }, 0);
    let n = maxEmbedded + 1;
    let candidate = `STU-${String(n).padStart(4, "0")}`;
    while (taken.has(candidate.toLowerCase())) {
      n += 1;
      candidate = `STU-${String(n).padStart(4, "0")}`;
    }
    return candidate;
  },

  async createStudent(
    values: TablesInsert<"students">,
  ): Promise<{ student: Student; enrolled: boolean }> {
    const studentCode = values.student_id?.trim();
    if (!values.name?.trim()) throw new Error("Full name is required.");
    if (!studentCode) throw new Error("Student ID is required.");

    // Layer 1: explicit pre-check so we never attempt a doomed INSERT.
    const existing = await api.studentByCode(studentCode);
    if (existing) {
      throw new Error(
        `Student ID ${studentCode} is already registered. Please enter a different Student ID.`,
      );
    }

    // Layer 2: the UNIQUE constraint still guards against race conditions;
    // its raw error is translated to a friendly message.
    const { data, error } = await supabase.from("students").insert(values).select().single();
    if (error) throw friendlyDbError(error, studentCode);

    const student = data as Student;
    let enrolled: boolean;
    try {
      const { error: progressError } = await supabase
        .from("progress")
        .insert({ student_id: student.id });
      if (progressError) throw progressError;
      enrolled = await ensureInitialEnrollment(student);
    } catch (err) {
      // Roll back the half-created student so no orphan rows remain.
      await supabase.from("students").delete().eq("id", student.id);
      throw friendlyDbError(err, studentCode);
    }
    return { student, enrolled };
  },

  async updateStudent(id: string, values: TablesUpdate<"students">): Promise<Student> {
    const nextCode = typeof values.student_id === "string" ? values.student_id.trim() : undefined;
    if (nextCode === "") throw new Error("Student ID is required.");

    // Editing a student may keep their own ID; only block codes owned by
    // somebody else. The UNIQUE constraint remains the final guard.
    if (nextCode) {
      const existing = await api.studentByCode(nextCode, id);
      if (existing) {
        throw new Error(
          `Student ID ${nextCode} is already used by another student. Please enter a different Student ID.`,
        );
      }
    }

    const { data, error } = await supabase
      .from("students")
      .update(values)
      .eq("id", id)
      .select()
      .single();
    if (error) throw friendlyDbError(error, nextCode);

    const student = data as Student;
    try {
      await ensureInitialEnrollment(student);
    } catch (err) {
      console.error("[EasySpeak] Enrollment sync after update failed:", err);
    }
    return student;
  },

  async deleteStudent(id: string) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw friendlyDbError(error);
  },

  async archiveStudent(id: string) {
    const { error } = await supabase.from("students").update({ status: "Archived" }).eq("id", id);
    if (error) throw friendlyDbError(error);
  },

  // -------------------------------------------------------------------------
  // Enrollments: one student can take many programs.
  // -------------------------------------------------------------------------
  async enrollments(): Promise<EnrollmentWithProgram[]> {
    return unwrap(
      await supabase
        .from("enrollments")
        .select("*, programs(name)")
        .order("created_at", { ascending: true }),
    );
  },

  // Creates an enrollment for an EXISTING student (no new student row).
  async enrollExistingStudent(params: {
    studentId: string;
    programName: string;
    teacherId?: string | null;
    enrollmentDate?: string;
    currentLevel: string;
    targetLevel: string;
    status?: string;
  }): Promise<void> {
    if (!params.programName.trim()) throw new Error("Program is required.");

    const program = await api.programByName(params.programName.trim());

    // Explicit duplicate-enrollment check with a friendly message.
    const dup = await api.findEnrollment(params.studentId, program.id, params.teacherId ?? null);
    if (dup) throw new Error("Student is already enrolled in this course.");

    const insert: TablesInsert<"enrollments"> = {
      student_id: params.studentId,
      program_id: program.id,
      teacher_id: params.teacherId ?? null,
      current_level: params.currentLevel,
      target_level: params.targetLevel,
      status: params.status ?? "Active",
    };
    if (params.enrollmentDate) insert.enrollment_date = params.enrollmentDate;
    const { error } = await supabase.from("enrollments").insert(insert);
    // The DB unique constraint (student + program + teacher) catches races.
    if (error && isUniqueViolation(error)) {
      throw new Error("Student is already enrolled in this course.");
    }
    if (error) throw friendlyDbError(error);
  },

  async findEnrollment(
    studentId: string,
    programId: string,
    teacherId: string | null,
  ): Promise<Enrollment | null> {
    let q = supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("program_id", programId);
    q = teacherId ? q.eq("teacher_id", teacherId) : q.is("teacher_id", null);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw friendlyDbError(error);
    return (data as Enrollment | null) ?? null;
  },

  async deleteEnrollment(id: string) {
    const { error } = await supabase.from("enrollments").delete().eq("id", id);
    if (error) throw friendlyDbError(error);
  },

  async programs(): Promise<Program[]> {
    return unwrap(await supabase.from("programs").select("*").order("name"));
  },
  async programByName(name: string): Promise<Program> {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("name", name)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (data) return data as Program;
    // Unknown program name (legacy data): register it with the full ladder.
    const created = await supabase.from("programs").insert({ name }).select().single();
    if (created.error) throw friendlyDbError(created.error);
    return created.data as Program;
  },

  async teachers(): Promise<Teacher[]> {
    return unwrap(await supabase.from("teachers").select("*").order("name"));
  },

  // Resolves the logged-in user to their teachers row (by user_id, then
  // email, then display name). Returns null when unresolvable.
  async currentTeacher(): Promise<Teacher | null> {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return null;

      const byUser = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (byUser.data) return byUser.data as Teacher;

      const email = user.email ?? null;
      if (email) {
        const byEmail = await supabase
          .from("teachers")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        if (byEmail.data) return byEmail.data as Teacher;
      }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const name = [meta["full_name"], meta["name"]].find(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      );
      if (name) {
        const byName = await supabase
          .from("teachers")
          .select("*")
          .ilike("name", name.trim())
          .maybeSingle();
        if (byName.data) return byName.data as Teacher;
      }
      return null;
    } catch (err) {
      console.error("[EasySpeak] Could not resolve current teacher:", err);
      return null;
    }
  },

  // Same resolution as currentTeacher(), but creates the teachers row for
  // the logged-in user on first use so new students get teacher_id set.
  async getOrCreateCurrentTeacher(): Promise<Teacher | null> {
    const found = await api.currentTeacher();
    if (found) return found;
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return null;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const email = user.email ?? null;
      const name =
        [meta["full_name"], meta["name"]].find(
          (v): v is string => typeof v === "string" && v.trim().length > 0,
        ) ??
        email?.split("@")[0] ??
        null;
      if (!name) return null;

      const created = await supabase
        .from("teachers")
        .insert({ name: name.trim(), email, user_id: user.id })
        .select()
        .single();
      if (created.error && !isUniqueViolation(created.error)) throw created.error;
      if (created.data) return created.data as Teacher;
      // Lost a race on the unique name index: reuse the existing row.
      const refetched = await supabase
        .from("teachers")
        .select("*")
        .ilike("name", name.trim())
        .maybeSingle();
      return (refetched.data as Teacher | null) ?? null;
    } catch (err) {
      console.error("[EasySpeak] Could not create current teacher:", err);
      return null;
    }
  },

  async attendance(): Promise<Attendance[]> {
    return unwrap(
      await supabase.from("attendance").select("*").order("date", { ascending: false }).limit(2000),
    );
  },
  async upsertAttendance(rows: TablesInsert<"attendance">[]) {
    if (!rows.length) return;
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "lesson_id" });
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

  async attendanceWithLesson(): Promise<AttendanceWithLesson[]> {
    return unwrap(
      await supabase
        .from("attendance")
        .select("*, lessons!attendance_lesson_id_fkey(title, date, student_id)")
        .order("date", { ascending: false })
        .limit(2000),
    );
  },

  async upsertAttendanceForLesson(
    lessonId: string,
    studentId: string,
    date: string,
    values: { meeting?: string | null; status?: string; check_in_time?: string | null },
  ) {
    const { error } = await supabase.from("attendance").upsert(
      {
        lesson_id: lessonId,
        student_id: studentId,
        date,
        meeting: values.meeting ?? null,
        status: values.status ?? "Present",
        check_in_time: values.check_in_time ?? null,
      },
      { onConflict: "lesson_id" },
    );
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

// Creates the initial enrollment row that links a freshly created/updated
// student to their primary program. Returns true when a new enrollment was
// created, false when one already existed.
async function ensureInitialEnrollment(student: Student): Promise<boolean> {
  const programName = student.program?.trim();
  if (!programName) return false;
  const program = await api.programByName(programName);
  const teacherId = student.teacher_id ?? null;

  const dup = await api.findEnrollment(student.id, program.id, teacherId);
  if (dup) return false;

  const insert: TablesInsert<"enrollments"> = {
    student_id: student.id,
    program_id: program.id,
    teacher_id: teacherId,
    current_level: student.current_level,
    target_level: student.target_level,
    status: student.status === "Archived" ? "Inactive" : student.status || "Active",
  };
  if (student.enrollment_date) insert.enrollment_date = student.enrollment_date;
  const { error } = await supabase.from("enrollments").insert(insert);
  if (error && isUniqueViolation(error)) return false;
  if (error) throw friendlyDbError(error);
  return true;
}

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
  programs: ["programs"] as const,
  teachers: ["teachers"] as const,
  enrollments: ["enrollments"] as const,
};
