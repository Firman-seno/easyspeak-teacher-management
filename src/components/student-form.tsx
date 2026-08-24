import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Loader2, Search, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, statusTone } from "@/components/kit";
import { api, qk } from "@/lib/api";
import { LEVELS, STUDENT_STATUSES, initials, todayISO } from "@/lib/domain";
import type { Student } from "@/lib/domain";
import type { TablesInsert } from "@/integrations/supabase/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^[+()\-\s\d]{6,30}$/;
const STUDENT_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9\-_. ]*$/;

function validDateString(value: string) {
  if (!value) return true;
  if (!DATE_RE.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

// Rank on the global CEFR ladder. Levels outside the ladder (legacy data
// such as "IELTS Intermediate") rank above everything so they never force
// a target-level downgrade.
function cefrRank(level: string): number {
  const i = LEVELS.indexOf(level as (typeof LEVELS)[number]);
  return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i;
}

// Shared shape so both "create student" and "enroll existing" reuse it.
const formShape = {
  name: z.string().trim().min(1, "Full name is required").max(120),
  student_id: z.string().trim().min(1, "Student ID is required").max(40),
  gender: z.string().optional(),
  date_of_birth: z.string().refine(validDateString, "Invalid date"),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => !v || PHONE_RE.test(v), "Invalid phone number"),
  email: z.union([z.string().trim().email("Invalid email address").max(255), z.literal("")]),
  address: z.string().trim().max(300).optional(),
  program: z.string().trim().min(1, "Program is required").max(120),
  current_level: z.string().min(1, "Current level is required"),
  target_level: z.string().min(1),
  enrollment_date: z
    .string()
    .min(1, "Enrollment date is required")
    .refine(validDateString, "Invalid date"),
  teacher: z.string().trim().max(120).optional(),
  status: z.string().min(1),
  photo: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  parent_name: z.string().trim().max(120).optional(),
  parent_relationship: z.string().optional(),
  parent_phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => !v || PHONE_RE.test(v), "Invalid phone number"),
  parent_email: z.union([z.string().trim().email("Invalid email address").max(255), z.literal("")]),
};

function targetLevelIssue(ctx: z.RefinementCtx, _program: string, current: string, target: string) {
  if (current && target && cefrRank(target) < cefrRank(current)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target_level"],
      message: "Target level cannot be lower than the current level.",
    });
  }
}

const studentSchema = z
  .object(formShape)
  .superRefine((v, ctx) => targetLevelIssue(ctx, v.program, v.current_level, v.target_level));

const enrollSchema = z
  .object(formShape)
  .pick({
    program: true,
    current_level: true,
    target_level: true,
    enrollment_date: true,
  })
  .superRefine((v, ctx) => targetLevelIssue(ctx, v.program, v.current_level, v.target_level));

type FormValues = z.infer<typeof studentSchema>;

type EditableValues = FormValues;

const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Sibling", "Other"] as const;

const empty: EditableValues = {
  name: "",
  student_id: "",
  gender: "Female",
  date_of_birth: "",
  phone: "",
  email: "",
  address: "",
  program: "",
  current_level: "A1",
  target_level: "B1",
  enrollment_date: todayISO(),
  teacher: "",
  status: "Active",
  photo: "",
  notes: "",
  parent_name: "",
  parent_relationship: "",
  parent_phone: "",
  parent_email: "",
};

type IdStatus = "idle" | "invalid" | "checking" | "available" | "taken";

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!student;
  const [mode, setMode] = useState<"create" | "enroll">("create");
  const [values, setValues] = useState<EditableValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [idStatus, setIdStatus] = useState<IdStatus>("idle");
  const [existingStudent, setExistingStudent] = useState<Student | null>(null);
  const [generating, setGenerating] = useState(false);
  const [idTouched, setIdTouched] = useState(false);

  // Directory + relations used by both tabs.
  const [students, setStudents] = useState<Student[]>([]);
  const teachersQuery = useQuery({ queryKey: qk.teachers, queryFn: api.teachers, enabled: open });
  const enrollmentsQuery = useQuery({
    queryKey: qk.enrollments,
    queryFn: api.enrollments,
    enabled: open,
  });

  // --- "Enroll Existing Student" tab state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollTarget, setEnrollTarget] = useState<Student | null>(null);

  // Reset everything whenever the dialog opens for a different student.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setIdStatus("idle");
    setIdTouched(false);
    setExistingStudent(null);
    setMode("create");
    setSearchQuery("");
    setEnrollTarget(null);
    setValues(
      student
        ? {
            name: student.name,
            student_id: student.student_id,
            gender: student.gender ?? "Female",
            date_of_birth: student.date_of_birth ?? "",
            phone: student.phone ?? "",
            email: student.email ?? "",
            address: student.address ?? "",
            program: student.program,
            current_level: student.current_level,
            target_level: student.target_level,
            enrollment_date: student.enrollment_date,
            teacher: student.teacher ?? "",
            status: student.status,
            photo: student.photo ?? "",
            notes: student.notes ?? "",
            parent_name: student.parent_name ?? "",
            parent_relationship: student.parent_relationship ?? "",
            parent_phone: student.parent_phone ?? "",
            parent_email: student.parent_email ?? "",
          }
        : empty,
    );
  }, [open, student]);

  // Load the directory once per dialog session (used by the Enroll search).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .students()
      .then((rows) => !cancelled && setStudents(rows))
      .catch(() => !cancelled && setStudents([]));
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Pre-fill Teacher with the logged-in user's saved name when available.
  useEffect(() => {
    if (!open || student) return;
    let cancelled = false;
    api
      .currentTeacher()
      .then((t) => {
        if (!t || cancelled) return;
        setValues((v) => ({ ...v, teacher: v.teacher || t.name }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, student]);

  // Debounced real-time Student ID availability check (ignores own row).
  const studentCode = values.student_id.trim();
  useEffect(() => {
    if (!open || !studentCode) {
      setIdStatus("idle");
      setExistingStudent(null);
      return;
    }
    if (!STUDENT_CODE_RE.test(studentCode)) {
      setIdStatus("invalid");
      setExistingStudent(null);
      return;
    }
    let cancelled = false;
    setIdStatus("checking");
    const timer = setTimeout(() => {
      api
        .studentByCode(studentCode, student?.id)
        .then((existing) => {
          if (cancelled) return;
          setExistingStudent(existing);
          setIdStatus(existing ? "taken" : "available");
        })
        .catch(() => {
          if (!cancelled) setIdStatus("idle");
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, studentCode, student?.id]);

  const set = (key: keyof EditableValues, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const levelOptions = useMemo(() => {
    const list: string[] = [...LEVELS];
    // Legacy levels outside the CEFR ladder stay selectable for old records.
    for (const lv of [values.current_level, values.target_level]) {
      if (lv && !list.includes(lv)) list.push(lv);
    }
    return list;
  }, [values.current_level, values.target_level]);

  const targetError = useMemo(() => {
    if (!values.current_level || !values.target_level) return null;
    if (cefrRank(values.target_level) < cefrRank(values.current_level)) {
      return "Target level cannot be lower than the current level.";
    }
    return null;
  }, [values.current_level, values.target_level]);

  const changeCurrentLevel = (level: string) =>
    setValues((v) => {
      const target_level = cefrRank(v.target_level) >= cefrRank(level) ? v.target_level : level;
      return { ...v, current_level: level, target_level };
    });

  const applyEnrollDefaults = (s: Student) => {
    setValues((v) => ({
      ...v,
      program: s.program,
      enrollment_date: todayISO(),
    }));
  };

  const generateId = async () => {
    setGenerating(true);
    try {
      const id = await api.nextStudentId();
      setIdTouched(true);
      set("student_id", id);
    } catch (e) {
      toast.error((e as Error).message || "Could not generate a Student ID.");
    } finally {
      setGenerating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: qk.students });
    void qc.invalidateQueries({ queryKey: qk.enrollments });
    void qc.invalidateQueries({ queryKey: qk.progress });
    void qc.invalidateQueries({ queryKey: qk.reports });
    void qc.invalidateQueries({ queryKey: qk.attendance });
  };

  const saveMutation = useMutation({
    mutationFn: async (): Promise<{ enrolled: boolean }> => {
      // The stored code keeps the user's casing, but is always trimmed.
      // Case-insensitive + trimmed uniqueness is enforced by the DB index.
      const payload: TablesInsert<"students"> = {
        name: values.name.trim(),
        student_id: values.student_id.trim(),
        gender: values.gender || null,
        date_of_birth: values.date_of_birth || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        program: values.program.trim(),
        current_level: values.current_level,
        target_level: values.target_level,
        enrollment_date: values.enrollment_date,
        status: values.status,
        photo: values.photo || null,
        notes: values.notes || null,
        parent_name: values.parent_name || null,
        parent_relationship: values.parent_relationship || null,
        parent_phone: values.parent_phone || null,
        parent_email: values.parent_email || null,
        teacher: (values.teacher ?? "").trim() || null,
      };

      if (isEdit && student) {
        await api.updateStudent(student.id, payload);
        return { enrolled: false };
      }
      const result = await api.createStudent(payload);
      return { enrolled: result.enrolled };
    },
    onSuccess: ({ enrolled }) => {
      invalidate();
      if (isEdit) {
        toast.success("Student successfully updated.");
      } else {
        toast.success(
          enrolled ? "Student created and enrolled successfully." : "Student created successfully.",
        );
      }
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong."),
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!enrollTarget) throw new Error("Please select an existing student first.");
      await api.enrollExistingStudent({
        studentId: enrollTarget.id,
        programName: values.program,
        teacherId: resolvedTeacherId,
        enrollmentDate: values.enrollment_date,
        currentLevel: values.current_level,
        targetLevel: values.target_level,
        status: "Active",
      });
      return enrollTarget;
    },
    onSuccess: (target) => {
      invalidate();
      toast.success(`${target.name} enrolled successfully.`);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong."),
  });

  // -----------------------------------------------------------------------
  // Validation & submit gating
  // -----------------------------------------------------------------------
  const parsed = studentSchema.safeParse(values);
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= issue.message;
    }
  }

  const showForm = isEdit || mode === "create";
  const idOk = !showForm ? true : !!studentCode && idStatus === "available";

  const submitCreate = () => {
    setIdTouched(true);
    if (!parsed.success) {
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (targetError) {
      toast.error(targetError);
      return;
    }
    if (!idOk) {
      toast.error(
        idStatus === "taken" && existingStudent
          ? `Student ID ${studentCode} is already registered. Please enter a different Student ID.`
          : "Please wait until the Student ID is validated.",
      );
      return;
    }
    setErrors({});
    saveMutation.mutate();
  };

  // Best-effort match of the typed teacher name to a known teachers row so
  // the duplicate-enrollment guard keeps working with free-text input.
  const resolvedTeacherId = useMemo(() => {
    const wanted = (values.teacher ?? "").trim().toLowerCase();
    if (!wanted) return null;
    return (
      (teachersQuery.data ?? []).find((t) => t.name.trim().toLowerCase() === wanted)?.id ?? null
    );
  }, [values.teacher, teachersQuery.data]);

  // Duplicate-enrollment guard for the Enroll tab (same student + program +
  // teacher as an active enrollment). The server re-checks on save.
  const alreadyEnrolled = useMemo(() => {
    if (!enrollTarget) return false;
    const wanted = values.program.trim().toLowerCase();
    if (!wanted) return false;
    return (enrollmentsQuery.data ?? []).some(
      (e) =>
        e.student_id === enrollTarget.id &&
        e.status === "Active" &&
        e.programs?.name?.trim().toLowerCase() === wanted &&
        (e.teacher_id ?? null) === resolvedTeacherId,
    );
  }, [enrollTarget, values.program, resolvedTeacherId, enrollmentsQuery.data]);

  const enrollCheck = enrollSchema.safeParse(values);
  const enrollReady =
    !!enrollTarget && !alreadyEnrolled && enrollCheck.success && !enrollMutation.isPending;

  const submitEnroll = () => {
    if (!enrollTarget) {
      toast.error("Please select an existing student first.");
      return;
    }
    if (!enrollCheck.success) {
      const errs: Record<string, string> = {};
      for (const issue of enrollCheck.error.issues) errs[String(issue.path[0])] ??= issue.message;
      setErrors(errs);
      toast.error(errs["target_level"] ?? "Please complete the enrollment fields.");
      return;
    }
    if (alreadyEnrolled) {
      toast.error(`${enrollTarget.name} is already enrolled in ${values.program}.`);
      return;
    }
    setErrors({});
    enrollMutation.mutate();
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) => s.status !== "Archived" && `${s.name} ${s.student_id}`.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [students, searchQuery]);

  // -----------------------------------------------------------------------
  // Field renderers
  // -----------------------------------------------------------------------
  const field = (key: keyof EditableValues, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={String(values[key] ?? "")}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={!!errors[key]}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const selectField = (
    key: keyof EditableValues,
    label: string,
    options: readonly string[],
    onChange?: (v: string) => void,
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        {...(values[key] ? { value: values[key] } : {})}
        onValueChange={(v) => (onChange ? onChange(v) : set(key, v))}
      >
        <SelectTrigger aria-invalid={!!errors[key]}>
          <SelectValue placeholder={`Select ${label.replace(/ \*$/, "").toLowerCase()}`} />
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

  const teacherField = (
    <div className="space-y-1.5">
      <Label htmlFor="teacher">Teacher</Label>
      <Input
        id="teacher"
        value={values.teacher}
        onChange={(e) => set("teacher", e.target.value)}
        placeholder="Enter teacher name"
      />
    </div>
  );

  const programField = (
    <div className="space-y-1.5">
      <Label htmlFor="program">Program *</Label>
      <Input
        id="program"
        value={values.program}
        onChange={(e) => set("program", e.target.value)}
        placeholder="Enter program name"
        aria-invalid={!!errors["program"]}
      />
      {errors["program"] && <p className="text-xs text-destructive">{errors["program"]}</p>}
    </div>
  );

  const studentIdField = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="student_code">Student ID *</Label>
        {!isEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={generating}
            onClick={generateId}
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Wand2 className="size-3.5" />
            )}
            Generate Student ID
          </Button>
        )}
      </div>
      <Input
        id="student_code"
        value={values.student_id}
        onChange={(e) => {
          setIdTouched(true);
          set("student_id", e.target.value);
        }}
        onBlur={() => setIdTouched(true)}
        placeholder="e.g. 011 or STU-0011"
        aria-invalid={idStatus === "taken" || idStatus === "invalid" || (idTouched && !studentCode)}
      />
      {!studentCode && idTouched && (
        <p className="text-xs text-destructive">Student ID is required.</p>
      )}
      {idStatus === "checking" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Checking Student ID...
        </p>
      )}
      {idStatus === "available" && (
        <p className="text-xs text-success">✓ Student ID is available.</p>
      )}
      {idStatus === "invalid" && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Invalid Student ID format.
        </p>
      )}
      {idStatus === "taken" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs">
          <p className="font-medium text-destructive">
            ❌{" "}
            {isEdit
              ? `Student ID ${studentCode} is already used by another student.`
              : "Student ID already exists."}
          </p>
          {!isEdit && (
            <>
              <p className="mt-0.5 text-muted-foreground">Please enter a different Student ID.</p>
              {existingStudent && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">
                    Existing: <strong>{existingStudent.name}</strong>
                  </span>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => onOpenChange(false)}
                  >
                    <Link to="/students/$id" params={{ id: existingStudent.id }}>
                      View Existing Student
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7"
                    onClick={() => {
                      setMode("enroll");
                      setEnrollTarget(existingStudent);
                      setSearchQuery(`${existingStudent.name} (${existingStudent.student_id})`);
                      applyEnrollDefaults(existingStudent);
                    }}
                  >
                    Enroll Existing Student
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  const academicFields = (
    <>
      {programField}
      {selectField("current_level", "Current Level *", levelOptions, changeCurrentLevel)}
      <div className="space-y-1.5">
        <Label>Target Level</Label>
        <Select
          {...(values.target_level ? { value: values.target_level } : {})}
          onValueChange={(v) => set("target_level", v)}
        >
          <SelectTrigger aria-invalid={!!errors["target_level"]}>
            <SelectValue placeholder="Select target level" />
          </SelectTrigger>
          <SelectContent>
            {levelOptions.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(errors["target_level"] || targetError) && (
          <p className="text-xs text-destructive">{errors["target_level"] ?? targetError}</p>
        )}
      </div>
      {field("enrollment_date", "Enrollment Date *", "date")}
    </>
  );

  const showEnrollTab = mode === "enroll" && !isEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit student" : showEnrollTab ? "Enroll existing student" : "Add student"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the student profile. The Student ID must stay unique."
              : showEnrollTab
                ? "Pick a student who already exists and register them for another course or program. No duplicate student will be created."
                : "Complete the student profile. Fields marked required must be filled."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as "create" | "enroll");
              setErrors({});
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create New Student</TabsTrigger>
              <TabsTrigger value="enroll">Enroll Existing Student</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {showEnrollTab ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setEnrollTarget(null);
                }}
                placeholder="Search by name or Student ID…"
                className="pl-9"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="divide-y overflow-hidden rounded-lg border">
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setEnrollTarget(s);
                      setSearchQuery(`${s.name} (${s.student_id})`);
                      applyEnrollDefaults(s);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <Avatar className="size-8">
                      {s.photo && <AvatarImage src={s.photo} alt={s.name} />}
                      <AvatarFallback className="text-xs">{initials(s.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.student_id} • {s.program} • {s.current_level}
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(s.status)}>{s.status}</StatusBadge>
                  </button>
                ))}
              </div>
            )}

            {enrollTarget && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{enrollTarget.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Student ID {enrollTarget.student_id}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(enrollTarget.status)}>
                    {enrollTarget.status}
                  </StatusBadge>
                </div>
                {alreadyEnrolled && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {enrollTarget.name} is already enrolled in this course.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {academicFields}
              {teacherField}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={submitEnroll} disabled={!enrollReady}>
                {enrollMutation.isPending ? "Enrolling…" : "Enroll Student"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Full Name *")}
              {studentIdField}
              {selectField("gender", "Gender", ["Female", "Male", "Other"])}
              {field("date_of_birth", "Date of Birth", "date")}
              {field("phone", "Phone Number")}
              {field("email", "Email")}
              {academicFields}
              {teacherField}
              {selectField("status", "Status", STUDENT_STATUSES)}
              {field("photo", "Profile Photo URL")}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Parent / Guardian Information (optional)</Label>
                <div className="grid gap-4 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                  {field("parent_name", "Parent Name")}
                  {selectField("parent_relationship", "Relationship", RELATIONSHIPS)}
                  {field("parent_phone", "Phone Number")}
                  {field("parent_email", "Email")}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={values.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={values.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitCreate}
                disabled={
                  !parsed.success || !idOk || idStatus === "checking" || saveMutation.isPending
                }
              >
                {saveMutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create Student"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
