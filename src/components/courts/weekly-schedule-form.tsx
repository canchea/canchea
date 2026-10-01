"use client";

import { useActionState } from "react";
import { saveWeeklyScheduleAction } from "@/app/propietario/disponibilidad/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { dayNames, minuteToTime } from "@/lib/courts/time";
import type { Database } from "@/types/database";

type WeeklySchedule = Database["public"]["Tables"]["court_weekly_schedules"]["Row"];

export function WeeklyScheduleForm({ courtId, schedule }: { courtId: string; schedule: WeeklySchedule[] }) {
  const [state, action] = useActionState(saveWeeklyScheduleAction, initialFormState);
  const byDay = new Map(schedule.map((entry) => [entry.day_of_week, entry]));

  return (
    <form action={action} className="availability-form">
      <input name="court_id" type="hidden" value={courtId} />
      <div className="availability-days">
        {dayNames.map((dayName, day) => {
          const entry = byDay.get(day);
          const available = entry?.is_available ?? day < 6;
          return (
            <div className="availability-day" key={dayName}>
              <strong>{dayName}</strong>
              <label className="availability-toggle"><input defaultChecked={available} name={`available_${day}`} type="checkbox" /><span>Disponible</span></label>
              <label><span>Desde</span><input defaultValue={entry?.opens_minute == null ? "07:00" : minuteToTime(entry.opens_minute)} name={`opens_${day}`} step="1800" type="time" /></label>
              <label><span>Hasta</span><input defaultValue={entry?.closes_minute == null ? "23:00" : minuteToTime(entry.closes_minute)} name={`closes_${day}`} step="1800" type="time" /></label>
            </div>
          );
        })}
      </div>
      <div className="availability-form-footer"><AuthFeedback state={state} /><SubmitButton pendingText="Guardando horario…">Guardar horario semanal</SubmitButton></div>
    </form>
  );
}
