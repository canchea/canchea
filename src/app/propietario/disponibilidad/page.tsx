import type { Metadata } from "next";
import Link from "next/link";
import { deleteCourtBlockAction, deletePricingRuleAction } from "@/app/propietario/disponibilidad/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { ConfirmSubmitButton } from "@/components/courts/confirm-submit-button";
import { CourtBlockForm } from "@/components/courts/court-block-form";
import { PricingRuleForm } from "@/components/courts/pricing-rule-form";
import { WeeklyScheduleForm } from "@/components/courts/weekly-schedule-form";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { addDays, dateInTimeZone, dayNames, minuteToTime } from "@/lib/courts/time";
import { createClient } from "@/lib/supabase/server";
import type { CourtBlockKind } from "@/types/database";

export const metadata: Metadata = { title: "Horarios y precios", robots: { index: false, follow: false } };

const blockLabels: Record<CourtBlockKind, string> = {
  maintenance: "Mantenimiento",
  event: "Evento",
  internal_use: "Uso interno",
  other: "Otro",
};

function formatLocalDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ cancha?: string }> }) {
  const [account, query] = await Promise.all([requireRole("venue_owner"), searchParams]);
  const supabase = await createClient();
  const { data: venue } = await supabase.from("venues").select("id, commercial_name, status, timezone").eq("owner_id", account.user.id).maybeSingle();
  const shellLinks = [...ownerNavigation];

  if (!venue || venue.status !== "approved") {
    return (
      <PrivateShell links={shellLinks} title="Horarios y precios" description="Esta sección se habilita cuando tu complejo está aprobado.">
        <section className="private-card availability-empty"><h2>Complejo pendiente de aprobación</h2><p>Cuando tu complejo esté aprobado podrás definir horarios, precios y bloqueos por cancha.</p><Link className="button button--primary" href="/propietario">Revisar mi complejo</Link></section>
      </PrivateShell>
    );
  }

  const { data: courts } = await supabase.from("courts").select("*").eq("venue_id", venue.id).order("created_at");
  const courtRows = courts ?? [];
  const selectedCourt = courtRows.find((court) => court.id === query.cancha) ?? courtRows[0] ?? null;

  if (!selectedCourt) {
    return (
      <PrivateShell links={shellLinks} title="Horarios y precios" description="Configura la disponibilidad real de cada cancha.">
        <section className="private-card availability-empty"><h2>Primero registra una cancha</h2><p>Necesitas al menos una cancha antes de definir disponibilidad y precios.</p><Link className="button button--primary" href="/propietario/canchas">Registrar cancha</Link></section>
      </PrivateShell>
    );
  }

  const [{ data: schedule }, { data: pricingRules }, { data: blocks }, { data: durations }] = await Promise.all([
    supabase.from("court_weekly_schedules").select("*").eq("court_id", selectedCourt.id).order("day_of_week"),
    supabase.from("court_pricing_rules").select("*").eq("court_id", selectedCourt.id).eq("is_active", true).order("day_of_week").order("starts_minute"),
    supabase.from("court_blocks").select("*").eq("court_id", selectedCourt.id).gte("ends_at", new Date().toISOString()).order("starts_at"),
    supabase.from("court_durations").select("duration_minutes").eq("court_id", selectedCourt.id).order("duration_minutes"),
  ]);

  const today = dateInTimeZone(venue.timezone);
  const previewDates = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const { data: previewSlots, error: previewError } = await supabase.rpc("get_court_availability_range", {
    p_court_id: selectedCourt.id,
    p_start_date: today,
    p_days: 7,
  });
  const previewResults = previewDates.map((date) => ({
    date,
    slots: (previewSlots ?? []).filter((slot) => slot.slot_date === date),
  }));
  const enabledDurations = (durations ?? []).map((entry) => entry.duration_minutes);

  return (
    <PrivateShell links={shellLinks} title="Horarios y precios" description={`Configura la operación de ${venue.commercial_name} sin crear reservas manuales.`}>
      <section className="court-selector" aria-label="Seleccionar cancha">
        {courtRows.map((court) => (
          <Link className={court.id === selectedCourt.id ? "court-selector-card court-selector-card--active" : "court-selector-card"} href={`/propietario/disponibilidad?cancha=${court.id}`} key={court.id}>
            <span className={`court-status court-status--${court.status}`}>{court.status === "active" ? "Activa" : court.status === "inactive" ? "Pausada" : "Borrador"}</span>
            <strong>{court.name}</strong>
            <small>{court.capacity} jugadores · {court.status === "active" ? "Visible públicamente" : "No visible al público"}</small>
          </Link>
        ))}
      </section>

      <section className="private-card availability-section">
        <div className="section-heading"><span>01</span><div><h2>Horario semanal</h2><p>Debe estar dentro del horario general del complejo y usar intervalos de 30 minutos.</p></div></div>
        <WeeklyScheduleForm courtId={selectedCourt.id} schedule={schedule ?? []} />
      </section>

      <section className="private-card availability-section">
        <div className="section-heading"><span>02</span><div><h2>Reglas de precio</h2><p>Define un precio por día, franja y duración. Las reglas del mismo tipo no pueden superponerse.</p></div></div>
        <PricingRuleForm courtId={selectedCourt.id} durations={enabledDurations} />
        <div className="pricing-rule-list">
          {(pricingRules ?? []).length ? (pricingRules ?? []).map((rule) => (
            <article key={rule.id}>
              <div><strong>{dayNames[rule.day_of_week]}</strong><span>{minuteToTime(rule.starts_minute)} – {minuteToTime(rule.ends_minute)}</span></div>
              <div><strong>Bs {rule.price_bob}</strong><span>{rule.duration_minutes} minutos</span></div>
              <form action={deletePricingRuleAction}><input name="rule_id" type="hidden" value={rule.id} /><ConfirmSubmitButton message="¿Eliminar esta regla de precio? Los horarios que dependan de ella dejarán de estar disponibles.">Eliminar</ConfirmSubmitButton></form>
            </article>
          )) : <div className="inline-empty"><strong>Sin precios configurados</strong><p>Los horarios no aparecerán disponibles hasta que agregues reglas de precio.</p></div>}
        </div>
      </section>

      <section className="private-card availability-section">
        <div className="section-heading"><span>03</span><div><h2>Bloqueos manuales</h2><p>Úsalos para mantenimiento, eventos o uso interno. Nunca crean una reserva.</p></div></div>
        <CourtBlockForm courtId={selectedCourt.id} minimumDate={today} />
        <div className="court-block-list">
          {(blocks ?? []).length ? (blocks ?? []).map((block) => (
            <article key={block.id}>
              <span>{blockLabels[block.kind]}</span>
              <div><strong>{formatLocalDateTime(block.starts_at, venue.timezone)}</strong><p>hasta {formatLocalDateTime(block.ends_at, venue.timezone)}{block.reason ? ` · ${block.reason}` : ""}</p></div>
              <form action={deleteCourtBlockAction}><input name="block_id" type="hidden" value={block.id} /><ConfirmSubmitButton message="¿Desbloquear este periodo? Volverá a aparecer disponible si tiene precio.">Desbloquear</ConfirmSubmitButton></form>
            </article>
          )) : <div className="inline-empty"><strong>Sin bloqueos futuros</strong><p>La cancha seguirá su horario y reglas de precio.</p></div>}
        </div>
      </section>

      <section className="private-card availability-section availability-preview">
        <div className="section-heading"><span>04</span><div><h2>Vista previa de disponibilidad</h2><p>Resultado real del backend, considerando precios, bloqueos y una hora mínima de anticipación.</p></div></div>
        {previewError && <div className="page-notice page-notice--error">No pudimos actualizar la vista previa. Intenta recargar la página.</div>}
        <div className="availability-preview-days">
          {previewResults.map(({ date, slots }) => (
            <article key={date}>
              <time dateTime={date}>{new Intl.DateTimeFormat("es-BO", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</time>
              {slots.length ? <div>{slots.slice(0, 8).map((slot) => <span key={`${slot.starts_at}-${slot.duration_minutes}`}>{slot.start_time.slice(0, 5)} · {slot.duration_minutes} min · Bs {slot.price_bob}</span>)}{slots.length > 8 && <small>+{slots.length - 8} opciones</small>}</div> : <p>Sin horarios</p>}
            </article>
          ))}
        </div>
      </section>
    </PrivateShell>
  );
}
