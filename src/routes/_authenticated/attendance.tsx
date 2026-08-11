import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
        content: "Record and edit daily student attendance with present, late, excused and absent status.",
      },
      { property: "og:title", content: "Attendance — EasySpeak Teacher Management" },
      { property: "og:description", content: "Fast daily attendance entry for every class." },
    ],
  }),
  component: AttendancePage,
});

type Draft = { status: string; time: string; notes: string };

function AttendancePage() {
  const qc = useQueryClient();
  const students = useStudents();
  const attendance = useAttendance();

  const [date, setDate] = useState(todayISO());
  const [program, setProgram] = useState("all");
  const [meeting, setMeeting] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const [filterStudent, setFilterStudent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [toDelete, setToDelete] = useState<Attendance | null>(null);

  const roster = useMemo(
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

  const getDraft = (studentId: string): Draft => {
    const record = existing.get(studentId);
    return (
      drafts[studentId] ?? {
        status: record?.status ?? "Present",
        time: record?.check_in_time ?? "09:00",
        notes: record?.notes ?? "",
      }
    );
  };

  const setDraft = (studentId: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [studentId]: { ...getDraft(studentId), ...patch } }));

  const save = useMutation({
    mutationFn: () =>
      api.upsertAttendance(
        roster.map((s) => {
          const d = getDraft(s.id);
          return {
            student_id: s.id,
            date,
            status: d.status,
            check_in_time: d.time || null,
            meeting: meeting || null,
            notes: d.notes || null,
          };
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attendance });
      setDrafts({});
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

  const history = useMemo(() => {
    const nameOf = new Map((students.data ?? []).map((s) => [s.id, s.name]));
    return (attendance.data ?? [])
      .filter((r) => filterStudent === "all" || r.student_id === filterStudent)
      .filter((r) => filterStatus === "all" || r.status === filterStatus)
      .filter((r) => !filterMonth || r.date.startsWith(filterMonth))
      .slice(0, 100)
      .map((r) => ({ ...r, name: nameOf.get(r.student_id) ?? "—" }));
  }, [attendance.data, students.data, filterStudent, filterStatus, filterMonth]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Select a date and class, then mark every student in one pass."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending || roster.length === 0}>
            <Save className="size-4" /> Save Attendance
          </Button>
        }
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

      <Card className="shadow-soft overflow-hidden">
        {roster.length === 0 ? (
          <EmptyState title="No active students for this class." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-[180px]">Status</TableHead>
                  <TableHead className="w-[130px]">Time</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((s) => {
                  const d = getDraft(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.student_id}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={d.status}
                          onValueChange={(v) => setDraft(s.id, { status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTENDANCE_STATUSES.map((st) => (
                              <SelectItem key={st} value={st}>
                                {st}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={d.time}
                          onChange={(e) => setDraft(s.id, { time: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={d.notes}
                          placeholder="Optional note"
                          onChange={(e) => setDraft(s.id, { notes: e.target.value })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Attendance records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={filterStudent} onValueChange={setFilterStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                {(students.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <EmptyState title="No attendance records yet." />
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
                      <TableCell className="font-medium">{r.name}</TableCell>
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
