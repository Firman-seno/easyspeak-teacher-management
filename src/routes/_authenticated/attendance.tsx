import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { StudentCombobox } from "@/components/entity-comboboxes";
import { ConfirmDialog, EmptyState, PageHeader, StatusBadge, statusTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAttendance, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { ATTENDANCE_STATUSES, PROGRAMS, formatDate, todayISO } from "@/lib/domain";
import type { Attendance } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Record and edit daily student attendance with present, late, excused and absent status.",
      },
      { property: "og:title", content: "Attendance — EasySpeak Teacher Management" },
      { property: "og:description", content: "Fast daily attendance entry for every class." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const qc = useQueryClient();
  const students = useStudents();
  const attendance = useAttendance();

  const [date, setDate] = useState(todayISO());
  const [program, setProgram] = useState("all");
  const [meeting, setMeeting] = useState("");

  const [selectedStudent, setSelectedStudent] = useState("");
  const [status, setStatus] = useState("Present");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const [filterStudent, setFilterStudent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [toDelete, setToDelete] = useState<Attendance | null>(null);

  const availableStudents = useMemo(
    () =>
      (students.data ?? []).filter(
        (s) => s.status === "Active" && (program === "all" || s.program === program),
      ),
    [students.data, program],
  );

  const existing = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const r of attendance.data ?? []) if (r.date === date) map.set(r.student_id, r);
    return map;
  }, [attendance.data, date]);

  useEffect(() => {
    if (!selectedStudent) {
      setStatus("Present");
      setTime("09:00");
      setNotes("");
      return;
    }
    const record = existing.get(selectedStudent);
    setStatus(record?.status ?? "Present");
    setTime(record?.check_in_time ?? "09:00");
    setNotes(record?.notes ?? "");
  }, [selectedStudent, existing]);

  const resetForm = () => {
    setSelectedStudent("");
    setStatus("Present");
    setTime("09:00");
    setNotes("");
  };

  const save = useMutation({
    mutationFn: () => {
      if (!selectedStudent) throw new Error("No student selected");
      const s = availableStudents.find((st) => st.id === selectedStudent);
      if (!s) throw new Error("Student not found");
      return api.upsertAttendance([
        {
          student_id: s.id,
          date,
          status,
          check_in_time: time || null,
          meeting: meeting || null,
          notes: notes || null,
        },
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attendance });
      resetForm();
      toast.success("Attendance successfully saved.");
    },
    onError: () => toast.error("Something went wrong."),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateAttendance(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attendance });
      toast.success("Attendance successfully updated.");
    },
    onError: () => toast.error("Something went wrong."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAttendance(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attendance });
      toast.success("Data successfully deleted.");
      setToDelete(null);
    },
    onError: () => toast.error("Something went wrong."),
  });

  const recordsForFilters = useMemo(() => {
    return (attendance.data ?? []).filter((r) =>
      filterMonth ? r.date.startsWith(filterMonth) : r.date === date,
    );
  }, [attendance.data, date, filterMonth]);

  const history = useMemo(() => {
    const nameOf = new Map((students.data ?? []).map((s) => [s.id, s.name]));
    return recordsForFilters
      .filter((r) => filterStudent === "all" || r.student_id === filterStudent)
      .filter((r) => filterStatus === "all" || r.status === filterStatus)
      .slice(0, 100)
      .map((r) => ({ ...r, name: nameOf.get(r.student_id) ?? "—" }));
  }, [recordsForFilters, students.data, filterStudent, filterStatus]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Select a date and choose a student, then mark their attendance."
      />

      <Card className="shadow-soft p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Program / Class</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {PROGRAMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meeting">Meeting</Label>
            <Input
              id="meeting"
              value={meeting}
              onChange={(e) => setMeeting(e.target.value)}
              placeholder="e.g. Meeting 12"
            />
          </div>
        </div>
      </Card>

      <Card className="shadow-soft p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_130px_1fr_auto] sm:items-end sm:gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="student">Student *</Label>
            <StudentCombobox
              students={availableStudents}
              value={selectedStudent}
              onChange={(id) => setSelectedStudent(id)}
              triggerPlaceholder="Search or select student..."
              searchPlaceholder="Search student..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
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
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              placeholder="Optional note"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !selectedStudent}
            >
              <Save className="size-4" /> Save
            </Button>
          </div>
        </div>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Attendance records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StudentCombobox
              students={students.data ?? []}
              value={filterStudent}
              onChange={(id) => setFilterStudent(id)}
              allOption={{ label: "All students", value: "all" }}
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ATTENDANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>

          {history.length === 0 ? (
            <EmptyState
              title={
                filterMonth
                  ? "No attendance records found for this month."
                  : "No attendance records found for this date."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="min-w-0 font-medium truncate whitespace-nowrap">
                        {r.name}
                      </TableCell>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(v) => update.mutate({ id: r.id, status: v })}
                        >
                          <SelectTrigger className="w-[140px]">
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
                      </TableCell>
                      <TableCell>{r.check_in_time ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.notes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                          <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this attendance record?"
        description="This action cannot be undone."
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
