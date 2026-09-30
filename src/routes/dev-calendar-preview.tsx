import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

function DevCalendarPreview() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        locale={undefined}
        className="rounded-lg border"
      />
    </div>
  );
}

export const Route = createFileRoute("/dev-calendar-preview")({
  component: DevCalendarPreview,
});
