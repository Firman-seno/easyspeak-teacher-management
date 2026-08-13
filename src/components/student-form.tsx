import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

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
import { LEVELS, STUDENT_STATUSES, todayISO } from "@/lib/domain";
import type { Student } from "@/lib/domain";

const schema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(120),
  student_id: z.string().trim().min(1, "Student ID is required").max(40),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.string().trim().email("Invalid email address").max(255), z.literal("")]),
  address: z.string().trim().max(300).optional(),
  program: z.string().min(1, "Program is required"),
  current_level: z.string().min(1, "Level is required"),
  target_level: z.string().min(1),
  enrollment_date: z.string().min(1, "Enrollment date is required"),
  teacher: z.string().trim().max(120).optional(),
  status: z.string().min(1),
  photo: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

type FormValues = {
  name: string;
  student_id: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  program: string;
  current_level: string;
  target_level: string;
  enrollment_date: string;
  teacher: string;
  status: string;
  photo: string;
  notes: string;
};

const empty: FormValues = {
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
};

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
  const [values, setValues] = useState<FormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
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
          }
        : empty,
    );
  }, [open, student]);

  const set = (key: keyof FormValues, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const mutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const clean = {
        ...payload,
        date_of_birth: payload.date_of_birth || null,
        email: payload.email || null,
        phone: payload.phone || null,
        photo: payload.photo || null,
      };
      if (student) return api.updateStudent(student.id, clean);
      return api.createStudent(clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.students });
      qc.invalidateQueries({ queryKey: qk.progress });
      toast.success(student ? "Student successfully updated." : "Student successfully added.");
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
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} type={type} value={values[key]} onChange={(e) => set(key, e.target.value)} />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const selectField = (key: keyof FormValues, label: string, options: readonly string[]) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={values[key]} onValueChange={(v) => set(key, v)}>
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Add student"}</DialogTitle>
          <DialogDescription>
            Complete the student profile. Fields marked required must be filled.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Full Name *")}
          {field("student_id", "Student ID *")}
          {selectField("gender", "Gender", ["Female", "Male", "Other"])}
          {field("date_of_birth", "Date of Birth", "date")}
          {field("phone", "Phone Number")}
          {field("email", "Email")}
          {field("program", "Program *")}
          {selectField("current_level", "Current Level *", LEVELS)}
          {selectField("target_level", "Target Level", LEVELS)}
          {field("enrollment_date", "Enrollment Date *", "date")}
          {field("teacher", "Teacher")}
          {selectField("status", "Status", STUDENT_STATUSES)}
          {field("photo", "Profile Photo URL")}
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
          <Button onClick={submit} disabled={mutation.isPending}>
            {student ? "Save changes" : "Add student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
