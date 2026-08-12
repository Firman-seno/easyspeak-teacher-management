import { BookOpen, Check, ChevronsUpDown, UserRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Lesson, Student } from "@/lib/domain";

export function StudentCombobox({
  students,
  value,
  onChange,
  disabled,
  allOption,
}: {
  students: Student[];
  value: string;
  onChange: (id: string, student: Student | undefined) => void;
  disabled?: boolean;
  allOption?: { label: string; value: string };
}) {
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {selected.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {selected.program} • {selected.current_level}
                </span>
              </span>
            </span>
          ) : allOption && value === allOption.value ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{allOption.label}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="size-4 shrink-0" /> Search student…
            </span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(90vw,var(--radix-popover-trigger-width))] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search student by name…" />
          <CommandList>
            <CommandEmpty>No student found.</CommandEmpty>
            {allOption ? (
              <CommandGroup>
                <CommandItem
                  key={allOption.value}
                  value={allOption.value}
                  onSelect={() => {
                    onChange(allOption.value, undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === allOption.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{allOption.label}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Students">
              {students.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onChange(s.id, s);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 size-4", value === s.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="min-w-0">
                    <p className="truncate">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.student_id} • {s.program} • {s.current_level}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function LessonCombobox({
  lessons,
  value,
  onChange,
  disabled,
}: {
  lessons: Lesson[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = lessons.find((l) => l.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <BookOpen className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected.title}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="size-4 shrink-0" /> No related lesson
            </span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(90vw,var(--radix-popover-trigger-width))] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search lesson…" />
          <CommandList>
            <CommandEmpty>No lesson found.</CommandEmpty>
            <CommandGroup heading="Lessons / Materials">
              {lessons.map((l) => (
                <CommandItem
                  key={l.id}
                  value={l.title}
                  onSelect={() => {
                    onChange(l.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 size-4", value === l.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="min-w-0">
                    <p className="truncate">{l.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.topic ?? "General topic"} • {l.level ?? "No level"}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
