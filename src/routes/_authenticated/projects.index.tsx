import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Eye,
  FolderKanban,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog, EmptyState, PageHeader, StatusBadge, statusTone } from "@/components/kit";
import { ProjectFormDialog } from "@/components/project-form";
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
import { useProjects, useStudents } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { PROJECT_STATUSES, PROJECT_TYPES, effectiveProjectStatus, formatDate } from "@/lib/domain";
import type { Project } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Manage student projects, milestones, submissions and completion. Add, edit, filter and track projects by student.",
      },
      { property: "og:title", content: "Projects — EasySpeak Teacher Management" },
      {
        property: "og:description",
        content: "Track every student project from planning to completion.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const qc = useQueryClient();
  const projects = useProjects();
  const students = useStudents();

  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);

  const nameOf = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s.name])),
    [students.data],
  );

  const statusOf = (p: Project) => effectiveProjectStatus(p.status, p.due_date);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects.data ?? [])
      .map((p) => ({
        ...p,
        studentName: nameOf.get(p.student_id) ?? "—",
        effectiveStatus: effectiveProjectStatus(p.status, p.due_date),
      }))
      .filter((p) => !q || `${p.title} ${p.type} ${p.studentName}`.toLowerCase().includes(q))
      .filter((p) => studentId === "all" || p.student_id === studentId)
      .filter((p) => type === "all" || p.type === type)
      .filter((p) => status === "all" || p.effectiveStatus === status)
      .filter((p) => !date || p.assigned_date === date);
  }, [projects.data, nameOf, search, studentId, type, status, date]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of projects.data ?? []) {
      const s = effectiveProjectStatus(p.status, p.due_date);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [projects.data]);

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
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
      toast.success("Project successfully deleted.");
      setToDelete(null);
    },
    onError: () => toast.error("Something went wrong."),
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage student projects, milestones, submissions and completion."
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Add Project
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {PROJECT_STATUSES.map((s) => (
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
              {PROJECT_TYPES.map((t) => (
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
              {PROJECT_STATUSES.map((s) => (
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

      {projects.isError || students.isError ? (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <EmptyState
              title="Unable to load your projects."
              description={
                (projects.error ?? students.error)?.message ??
                "Something went wrong while fetching projects."
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    projects.refetch();
                    students.refetch();
                  }}
                >
                  Try Again
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : projects.isLoading || students.isLoading ? (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading projects…</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No projects yet."
          description="Create a project for your student."
          action={
            <Button onClick={openAdd}>
              <Plus className="size-4" /> Add Project
            </Button>
          }
        />
      ) : (
        <Card className="shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-foreground">
                          <FolderKanban className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.studentName}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.type}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(p.assigned_date)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(p.due_date)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.progress}%</TableCell>
                    <TableCell>
                      <StatusBadge tone={statusTone(p.effectiveStatus)}>
                        {p.effectiveStatus}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">{p.score ?? "—"}</TableCell>
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
                              <Link to="/projects/$id" params={{ id: p.id }}>
                                <Eye className="size-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setToDelete(p)}
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

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        students={students.data ?? []}
        lessons={[]}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete Project?"
        description="This action cannot be undone."
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
