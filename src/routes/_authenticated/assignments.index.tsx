import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AssignmentFormDialog } from "@/components/assignment-form";
import { ConfirmDialog, EmptyState, PageHeader, StatusBadge, statusTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { useAssignments, useLessons, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_TYPES,
  effectiveAssignmentStatus,
  formatDate,
} from "@/lib/domain";
import type { Assignment } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/assignments/")({
  head: () => ({
    meta: [
      { title: "Assignments — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Manage student assignments, tasks, submissions and scores. Add, edit, filter and track assignments by student.",
      },
      { property: "og:title", content: "Assignments — EasySpeak Teacher Management" },
      {
        property: "og:description",
        content: "Track every student assignment from assigned to graded.",
      },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const qc = useQueryClient();
  const assignments = useAssignments();
  const students = useStudents();
  const lessons = useLessons();

  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [toDelete, setToDelete] = useState<Assignment | null>(null);

  const nameOf = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s.name])),
    [students.data],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (assignments.data ?? [])
      .map((a) => ({
        ...a,
        studentName: nameOf.get(a.student_id) ?? "—",
        effectiveStatus: effectiveAssignmentStatus(a.status, a.due_date),
      }))
      .filter((a) => !q || `${a.title} ${a.type} ${a.studentName}`.toLowerCase().includes(q))
      .filter((a) => studentId === "all" || a.student_id === studentId)
      .filter((a) => type === "all" || a.type === type)
      .filter((a) => status === "all" || a.effectiveStatus === status)
      .filter((a) => !date || a.assigned_date === date);
  }, [assignments.data, nameOf, search, studentId, type, status, date]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of assignments.data ?? []) {
      const s = effectiveAssignmentStatus(a.status, a.due_date);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [assignments.data]);

  const studentOptions = useMemo(() => {
    const list = [...(students.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    if (studentId !== "all") {
      const current = list.find((s) => s.id === studentId);
      if (current) {
        list.splice(list.findIndex((s) => s.id === studentId), 1);
        list.unshift(current);
      }
    }
    return list;
  }, [students.data, studentId]);

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.assignments });
      toast.success("Assignment successfully deleted.");
      setToDelete(null);
    },
    onError: () => toast.error("Something went wrong."),
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (assignment: Assignment) => {
    setEditing(assignment);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Manage student assignments, tasks, submissions and scores."
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Add Assignment
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {ASSIGNMENT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus((cur) => (cur === s ? "all" : s))}
            className="rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-colors hover:bg-accent/10"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{s}</p>
            <p className="mt-1 text-xl font-semibold">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <Card className="shadow-soft p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, type or student"
              className="pl-9"
            />
          </div>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {studentOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ASSIGNMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ASSIGNMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="md:col-span-2 xl:col-span-2"
          />
        </div>
      </Card>

      {assignments.isError || students.isError ? (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <EmptyState
              title="Unable to load your assignments."
              description={
                (assignments.error ?? students.error)?.message ??
                "Something went wrong while fetching assignments."
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    assignments.refetch();
                    students.refetch();
                  }}
                >
                  Try Again
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : assignments.isLoading || students.isLoading ? (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading assignments…</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No assignments yet."
          description="Create an assignment for your student."
          action={
            <Button onClick={openAdd}>
              <Plus className="size-4" /> Add Assignment
            </Button>
          }
        />
      ) : (
        <Card className="shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-foreground">
                          <ClipboardList className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{a.studentName}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{a.type}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(a.assigned_date)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(a.due_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={statusTone(a.effectiveStatus)}>
                        {a.effectiveStatus}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.score === null || a.score === undefined
                        ? "—"
                        : a.max_score
                          ? `${a.score}/${a.max_score}`
                          : a.score}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Options">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to="/assignments/$id" params={{ id: a.id }}>
                                <Eye className="size-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setToDelete(a)}
                            >
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        assignment={editing}
        students={students.data ?? []}
        lessons={lessons.data ?? []}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete Assignment?"
        description="This action cannot be undone."
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
