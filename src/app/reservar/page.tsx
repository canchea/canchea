import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createBookingHoldAction } from "@/app/reservar/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { SubmitButton } from "@/components/auth/submit-button";
import { playerNavigation } from "@/config/dashboard-navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Revisar reserva", robots: { index: false, follow: false } };

type ReservationParams = {
  cancha?: string;
  fecha?: string;
  hora?: string;
  duracion?: string;
  estado?: string;
};

function validUuid(input: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

export default async function ReservationReviewPage({ searchParams }: { searchParams: Promise<ReservationParams> }) {
  const params = await searchParams;
  const courtId = params.cancha ?? "";
  const date = params.fecha ?? "";
  const time = params.hora ?? "";
  const duration = Number(params.duracion);
  const returnPath = `/reservar?${new URLSearchParams({ cancha: courtId, fecha: date, hora: time, duracion: String(duration) }).toString()}`;
  const account = await getCurrentAccount();

  if (!account) redirect(`/auth/iniciar-sesion?continuar=${encodeURIComponent(returnPath)}`);
  if (account.profile?.role !== "player") redirect("/cuenta");
  if (!validUuid(courtId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):00$/.test(time) || duration !== 60) {
    redirect("/buscar?estado=reserva-invalida");
  }

  const supabase = await createClient();
  const [{ data: court }, { data: slots }] = await Promise.all([
    supabase
      .from("courts")
      .select("id, name, capacity, venues(commercial_name, slug, zone), sports(name), sport_modalities(name), court_surfaces(name)")
      .eq("id", courtId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.rpc("get_court_availability", { p_court_id: courtId, p_date: date }),
  ]);

  const slot = (slots ?? []).find((candidate) => candidate.start_time.slice(0, 5) === time && candidate.duration_minutes === duration);
  if (!court || !slot) {
    return (
      <PrivateShell title="Este horario ya no está disponible" description="Otra persona pudo reservarlo o el horario dejó de cumplir las reglas del complejo." links={[...playerNavigation]}>
        <section className="private-card booking-unavailable">
          <span className="status-dot status-dot--warning">Disponibilidad actualizada</span>
          <h2>Elige otro horario</h2>
          <p>No se creó ningún cargo ni reserva.</p>
          <Link className="button button--primary" href="/buscar">Volver al buscador</Link>
        </section>
      </PrivateShell>
    );
  }

  const price = Number(slot.price_bob);
  const formatBob = (value: number) => value.toFixed(Number.isInteger(value) ? 0 : 2);
  const venue = court.venues;
  const formattedDate = new Intl.DateTimeFormat("es-BO", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  const endTime = `${String((Number(time.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`;

  return (
    <PrivateShell title="Revisa tu reserva" description="Confirma la cancha y el horario. No necesitas pagar para reservar." links={[...playerNavigation]}>
      <ol className="booking-flow-steps booking-review-steps" aria-label="Proceso de reserva">
        <li className="booking-flow-step booking-flow-step--done"><span>1</span><strong>Cancha</strong></li>
        <li className="booking-flow-step booking-flow-step--done"><span>2</span><strong>Fecha y hora</strong></li>
        <li className="booking-flow-step booking-flow-step--active"><span>3</span><strong>Confirmar</strong></li>
      </ol>
      <div className="booking-review-grid">
        <section className="private-card booking-review-card">
          {params.estado === "no-disponible" ? <p className="form-feedback form-feedback--error" role="alert">Ese horario acaba de ser tomado. Elige otra opción.</p> : null}
          {params.estado === "complejo-sin-saldo" ? <p className="form-feedback form-feedback--error" role="alert">El complejo pausó temporalmente las reservas online. Elige otra cancha disponible.</p> : null}
          <p className="eyebrow">Tu selección</p>
          <h2>{venue?.commercial_name}</h2>
          <p>{court.name} · {court.sports?.name} · {court.sport_modalities?.name}</p>
          <dl className="booking-summary-list">
            <div><dt>Fecha</dt><dd className="booking-date-value">{formattedDate}</dd></div>
            <div><dt>Hora</dt><dd>{time} – {endTime}</dd></div>
            <div><dt>Duración</dt><dd>1 hora</dd></div>
            <div><dt>Zona</dt><dd>{venue?.zone}</dd></div>
            <div><dt>Superficie</dt><dd>{court.court_surfaces?.name}</dd></div>
          </dl>
        </section>
        <aside className="private-card booking-price-card">
          <p className="eyebrow">Resumen de la reserva</p>
          <div><span>Precio por 1 hora</span><strong>Bs {formatBob(price)}</strong></div>
          <div><span>Pago ahora</span><strong>Bs 0</strong></div>
          <div><span>Pago en el complejo</span><strong>Bs {formatBob(price)}</strong></div>
          <p>La reserva es gratuita. Pagarás el precio completo directamente al complejo cuando vayas a jugar.</p>
          <section className="booking-policy-summary" aria-label="Resumen de cancelación">
            <strong>Reserva con compromiso</strong>
            <ul>
              <li>Si cambias de plan, cancela desde tu cuenta para liberar el horario.</li>
              <li>Las inasistencias reiteradas pueden limitar futuras reservas.</li>
            </ul>
            <Link href="/cancelaciones">Ver política completa</Link>
          </section>
          <form action={createBookingHoldAction}>
            <input name="court_id" type="hidden" value={courtId} />
            <input name="starts_at" type="hidden" value={slot.starts_at} />
            <input name="duration_minutes" type="hidden" value={duration} />
            <input name="return_path" type="hidden" value={returnPath} />
            <SubmitButton pendingText="Confirmando reserva…">Confirmar reserva gratis</SubmitButton>
          </form>
          <Link className="booking-back-link" href={`/complejos/${venue?.slug}?fecha=${date}&desde=${date}&hora=${time}&cancha=${courtId}#disponibilidad`}>Cambiar fecha u hora</Link>
        </aside>
      </div>
    </PrivateShell>
  );
}
