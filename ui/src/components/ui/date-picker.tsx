import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  placeholder?: string
  minDate?: Date
  className?: string
  rangeEnd?: Date // For showing the range visually
}

export function DatePicker({
  date,
  onSelect,
  disabled,
  placeholder = "Pick a date",
  minDate,
  className,
  rangeEnd,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal h-10 px-3 py-2 border-gray-300 hover:bg-gray-50",
            !date && "text-gray-400",
            date && "text-gray-900",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {date ? (
            <span className="truncate">{format(date, "MMM-dd-yyyy")}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            onSelect?.(newDate)
            setOpen(false)
          }}
          disabled={disabled}
          fromDate={minDate}
          initialFocus
          modifiers={{
            range_middle: (day) => {
              if (!date || !rangeEnd) return false
              // Support bidirectional ranges by determining start and end
              const start = date < rangeEnd ? date : rangeEnd
              const end = date < rangeEnd ? rangeEnd : date
              return day > start && day < end
            },
            range_start: (day) => {
              if (!date || !rangeEnd) return false
              const start = date < rangeEnd ? date : rangeEnd
              return day.getTime() === start.getTime()
            },
            range_end: (day) => {
              if (!date || !rangeEnd) return false
              const end = date < rangeEnd ? rangeEnd : date
              return day.getTime() === end.getTime()
            }
          }}
          modifiersClassNames={{
            range_middle: "rdp-day_range_middle",
            range_start: "rdp-day_range_start", 
            range_end: "rdp-day_range_end"
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

