import { CalendarDays } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateToISO, formatDate, isoToDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

// Responsive, date-only field built on react-day-picker. Values are kept as
// "YYYY-MM-DD" strings using local calendar parts so the picked day never
// shifts across timezones. `from` / `to` bound the selectable range.
export function DatePickerField({
  id,
  label,
  value,
  onChange,
  placeholder = "Select a date",
  disabled,
  from,
  to,
  error,
  helper,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  from?: string | undefined;
  to?: string | undefined;
  error?: string | undefined;
  helper?: string | undefined;
}) {
  const disabledMatchers: Matcher[] = [];
  const fromDate = from ? isoToDate(from) : undefined;
  const toDate = to ? isoToDate(to) : undefined;
  if (fromDate) disabledMatchers.push({ before: fromDate });
  if (toDate) disabledMatchers.push({ after: toDate });

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-base transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="truncate">{value ? formatDate(value) : placeholder}</span>
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={isoToDate(value)}
            onSelect={(d) => onChange(d ? dateToISO(d) : "")}
            disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {helper && !error && <p className="text-xs text-muted-foreground">{helper}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
