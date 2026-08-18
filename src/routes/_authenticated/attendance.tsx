import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { StudentCombobox } from "@/components/entity-comboboxes";
import { EmptyState, PageHeader, StatusBadge, statusTone } from "@/components/kit";
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
import { useAttendance, useLessons, useStudents } from "@/hooks/use-data";
import { ATTENDANCE_STATUSES, formatDate, summarizeAttendance } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "View and filter all student attendance records across lessons.",
      },
      { property: "og:title", content: "Attendance — EasySpeak Teacher Management" },
      { property: "og:description", content: "View and filter all attendance records." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const students = useStudents();
  const attendance = useAttendance();
  const lessons = useLessons();

  const [filterStudent, setFilterStudent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");

  const nameOf = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s.name])),
    [students.data],
  );

  const lessonTitleOf = useMemo(
    () => new Map((lessons.data ?? []).map((l) => [l.id, l.title])),
    [lessons.data],
  );

  const records = useMemo(() => {
    return (attendance.data ?? [])
      .filter((r) => filterStudent === "all" || r.student_id === filterStudent)
      .filter((r) => filterStatus === "all" || r.status === filterStatus)
      .filter((r) => !filterMonth || r.date.startsWith(filterMonth))
      .slice(0, 500)
      .map((r) => ({
        ...r,
        name: nameOf.get(r.student_id) ?? "—",
        lessonTitle: r.lesson_id ? (lessonTitleOf.get(r.lesson_id) ?? "—") : null,
      }));
  }, [attendance.data, filterStudent, filterStatus, filterMonth, nameOf, lessonTitleOf]);

  const summary = useMemo(() => summarizeAttendance(records), [records]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="View and filter all student attendance records. Attendance is recorded through Lessons / Materials."
      />

      <Card className="shadow-soft">
        <CardContent className="p-4">
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
            <div className="space-y-1.5">
              <Label className="sr-only" htmlFor="filter-month">Month</Label>
              <Input
                id="filter-month"
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Total", summary.total],
          ["Present", summary.present],
          ["Late", summary.late],
          ["Excused", summary.excused],
          ["Absent", summary.absent],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-3 text-center"
          >
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
          </div>
        ))}
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Attendance records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState
              title="No attendance records found."
              description="Attendance is recorded when you create or edit a lesson in Lessons / Materials."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Lesson</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                      <TableCell>{r.meeting ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {r.lessonTitle ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                      </TableCell>
                      <TableCell>{r.check_in_time ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
