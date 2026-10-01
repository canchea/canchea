import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createBookingHoldAction } from "@/app/reservar/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { SubmitButton } from "@/components/auth/submit-button";
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
  if (!validUuid(courtId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || ![30, 60].includes(duration)) {
    redirect("/buscar?estado=reserva-invalida");
  }

  const supabase = await createClient();
  const [{ data: court }, { data: slots }, { data: depositSetting }] = await Promise.all([
    supabase
      .from("courts")
      .select("id, name, capacity, venues(commercial_name, slug, zone), sports(name), sport_modalities(name), court_surfaces(name)")
      .eq("id", courtId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.rpc("get_court_availability", { p_court_id: courtId, p_date: date }),
    supabase.from("platform_settings").select("value").eq("key", "booking_deposit_amount").maybeSingle(),
  ]);

  const slot = (slots ?? []).find((candidate) => candidate.start_time.slice(0, 5) === time && candidate.duration_minutes === duration);
  if (!court || !slot) {
    return (
      <PrivateShell title="Este horario ya no está disponible" description="Otra persona pudo reservarlo o el horario dejó de cumplir las reglas del complejo.">
        <section className="private-card booking-unavailable">
          <span className="status-dot status-dot--warning">Disponibilidad actualizada</span>
          <h2>Elige otro horario</h2>
          <p>No se creó ningún cargo ni reserva.</p>
          <Link className="button button--primary" href="/buscar">Volver al buscador</Link>
        </section>
      </PrivateShell>
    );
  }

  const deposit = Number(depositSetting?.value ?? 50);
  const venue = court.venues;

  return (
    <PrivateShell title="Revisa tu reserva" description="Confirma los datos antes de iniciar el bloqueo temporal de cinco minutos.">
      <div className="booking-review-grid">
        <section className="private-card booking-review-card">
          {params.estado === "no-disponible" ? <p className="form-feedback form-feedback--error" role="alert">Ese horario acaba de ser tomado. Elige otra opción.</p> : null}
          <p className="eyebrow">Tu selección</p>
          <h2>{venue?.commercial_name}</h2>
          <p>{court.name} · {court.sports?.name} · {court.sport_modalities?.name}</p>
          <dl className="booking-summary-list">
            <div><dt>Fecha</dt><dd>{date}</dd></div>
            <div><dt>Hora</dt><dd>{time}</dd></div>
            <div><dt>Duración</dt><dd>{duration} min</dd></div>
            <div><dt>Zona</dt><dd>{venue?.zone}</dd></div>
            <div><dt>Superficie</dt><dd>{court.court_surfaces?.name}</dd></div>
          </dl>
        </section>
        <aside className="private-card booking-price-card">
          <p className="eyebrow">Resumen de pago</p>
          <div><span>Precio de la cancha</span><strong>Bs {Number(slot.price_bob).toFixed(0)}</strong></div>
          <div><span>Seña requerida</span><strong>Bs {deposit.toFixed(0)}</strong></div>
          <div><span>Saldo en el complejo</span><strong>Bs {(Number(slot.price_bob) - deposit).toFixed(0)}</strong></div>
          <p>En la Fase 8 conectaremos el pago mock. Por ahora validamos el motor de reserva y el hold.</p>
          <form action={createBookingHoldAction}>
            <input name="court_id" type="hidden" value={courtId} />
            <input name="starts_at" type="hidden" value={slot.starts_at} />
            <input name="duration_minutes" type="hidden" value={duration} />
            <input name="return_path" type="hidden" value={returnPath} />
            <SubmitButton pendingText="Bloqueando horario…">Bloquear por 5 minutos</SubmitButton>
          </form>
          <Link className="booking-back-link" href={`/complejos/${venue?.slug}?fecha=${date}&hora=${time}&cancha=${courtId}`}>Volver al complejo</Link>
        </aside>
      </div>
    </PrivateShell>
  );
}
