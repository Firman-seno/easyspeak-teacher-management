import { useQuery } from "@tanstack/react-query";
import { Copy, FilePlus2, Inbox, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, qk } from "@/lib/api";
import { LEVELS, PROGRAMS, formatDate } from "@/lib/domain";
import type { LessonWithStudent } from "@/lib/api";

export type ExistingLessonContent = {
  title: string;
  subtitle: string;
  successIndicator: string;
};

export function ExistingContentDialog({
  open,
  onOpenChange,
  program,
  level,
  excludeLessonId,
  onUseContent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: string | null;
  level?: string | null;
  excludeLessonId?: string | null;
  onUseContent: (content: ExistingLessonContent) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebouncedQuery("");
    setProgramFilter(program ?? "all");
    setLevelFilter(level ?? "all");
  }, [open, program, level]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const searchParams: Parameters<typeof api.searchLessons>[0] = { limit: 20 };
  if (debouncedQuery) searchParams.q = debouncedQuery;
  if (programFilter !== "all") searchParams.program = programFilter;
  if (levelFilter !== "all") searchParams.level = levelFilter;
  if (excludeLessonId) searchParams.excludeLessonId = excludeLessonId;

  const { data, isFetching, isError, error } = useQuery({
    queryKey: [
      ...qk.lessons,
      "existing-content",
      debouncedQuery,
      programFilter,
      levelFilter,
      excludeLessonId ?? "none",
    ],
    queryFn: () => api.searchLessons(searchParams),
    enabled: open,
    staleTime: 30_000,
  });

  const results = data ?? [];

  const applyContent = (lesson: LessonWithStudent) => {
    onUseContent({
      title: lesson.title,
      subtitle: lesson.subtitle ?? "",
      successIndicator: lesson.success_indicator ?? "",
    });
    toast.success(`Content copied from "${lesson.title}".`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Use Existing Content</DialogTitle>
          <DialogDescription>
            Search lessons you have already created and reuse their Title, Subtitle and Success
            Indicator for this new material.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, subtitle or success indicator…"
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Program" />
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
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-h-24 flex-1 space-y-2 overflow-y-auto pr-1">
          {isFetching ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                  <Skeleton className="h-8 w-32 shrink-0" />
                </div>
              ))}
            </>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load existing content. {error?.message ?? "Please try again."}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
              <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="size-4" />
              </div>
              <p className="font-medium text-foreground">No existing lesson content found.</p>
              <p className="text-sm text-muted-foreground">
                You can still create this material manually.
              </p>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                <FilePlus2 className="size-4" /> Create New Content
              </Button>
            </div>
          ) : (
            results.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{lesson.title}</p>
                  {lesson.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {lesson.subtitle}
                    </p>
                  )}
                  {lesson.success_indicator && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      Success Indicator: {lesson.success_indicator}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">
                      {[lesson.program, lesson.level].filter(Boolean).join(" • ") ||
                        "No program / level"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> Used by: {lesson.students?.name ?? "—"}
                    </span>
                    <span>{formatDate(lesson.date)}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyContent(lesson)}
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Copy className="size-3.5" /> Use This Content
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <FilePlus2 className="size-4" /> Create New Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
