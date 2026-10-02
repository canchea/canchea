import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { adminNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analítica del piloto", robots: { index: false, follow: false } };

const PERIODS = [7, 30, 90] as const;

type Ranked = { label: string; count: number };
type VenueStat = { label: string; views: number; confirmed: number };
type FunnelSummary = {
  days: number;
  funnel: Record<
    | "visitors" | "searchers" | "venue_viewers" | "slot_selectors" | "checkout_players" | "confirmed_players"
    | "searches" | "venue_views" | "slot_selections" | "checkouts" | "confirmed" | "expired" | "cancelled" | "empty_searches",
    number
  >;
  sports: Ranked[];
  zones: Ranked[];
  venues: VenueStat[];
};

function percent(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "—";
}

function RankedList({ title, rows }: { title: string; rows: Ranked[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="private-card dashboard-section">
      <p className="eyebrow">Búsquedas</p>
      <h2>{title}</h2>
      {rows.length ? (
        <ol className="analytics-ranking">
          {rows.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <div aria-hidden="true"><i style={{ width: `${(row.count / max) * 100}%` }} /></div>
              <strong>{row.count}</strong>
            </li>
          ))}
        </ol>
      ) : <p className="empty-copy">Todavía no hay búsquedas en este periodo.</p>}
    </section>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await requireRole("super_admin");
  const query = await searchParams;
  const days = PERIODS.find((period) => String(period) === query.dias) ?? 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_funnel_summary", { p_days: days });
  const summary = (error ? null : data) as FunnelSummary | null;
  const funnel = summary?.funnel;

  const stages = funnel ? [
    { label: "Visitantes", value: funnel.visitors, detail: "Personas distintas que navegaron la web" },
    { label: "Buscaron", value: funnel.searchers, detail: `${funnel.searches} búsquedas · ${funnel.empty_searches} sin resultados` },
    { label: "Vieron un complejo", value: funnel.venue_viewers, detail: `${funnel.venue_views} vistas de ficha` },
    { label: "Eligieron horario", value: funnel.slot_selectors, detail: `${funnel.slot_selections} selecciones` },
    { label: "Iniciaron pago", value: funnel.checkout_players, detail: `${funnel.checkouts} bloqueos · ${funnel.expired} vencidos` },
    { label: "Reservaron", value: funnel.confirmed_players, detail: `${funnel.confirmed} reservas confirmadas · ${funnel.cancelled} canceladas` },
  ] : [];
  const top = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <PrivateShell title="Analítica del piloto" description="Embudo desde la búsqueda hasta la reserva confirmada." links={[...adminNavigation]}>
      <nav aria-label="Periodo" className="analytics-periods">
        {PERIODS.map((period) => (
          <Link aria-current={period === days ? "page" : undefined} className={period === days ? "active" : ""} href={`/admin/analitica?dias=${period}`} key={period}>
            Últimos {period} días
          </Link>
        ))}
      </nav>

      {!summary || !funnel ? (
        <section className="private-card"><p>No pudimos cargar la analítica. Verifica que la migración del embudo esté aplicada.</p></section>
      ) : (
        <>
          <section className="dashboard-metrics">
            <article><span>Conversión búsqueda → reserva</span><strong>{percent(funnel.confirmed_players, funnel.searchers)}</strong></article>
            <article><span>Conversión pago iniciado → reserva</span><strong>{percent(funnel.confirmed, funnel.checkouts)}</strong></article>
            <article><span>Búsquedas sin resultados</span><strong>{percent(funnel.empty_searches, funnel.searches)}</strong></article>
            <article><span>Reservas confirmadas</span><strong>{funnel.confirmed}</strong></article>
          </section>

          <section className="private-card dashboard-section">
            <p className="eyebrow">Embudo</p>
            <h2>¿Dónde se pierden los jugadores?</h2>
            <ol className="analytics-funnel">
              {stages.map((stage, index) => (
                <li key={stage.label}>
                  <div className="analytics-funnel-label">
                    <strong>{stage.label}</strong>
                    <span>{stage.detail}</span>
                  </div>
                  <div aria-hidden="true" className="analytics-funnel-bar"><i style={{ width: `${(stage.value / top) * 100}%` }} /></div>
                  <div className="analytics-funnel-value">
                    <strong>{stage.value}</strong>
                    {index > 0 ? <span>{percent(stage.value, stages[index - 1].value)} del paso anterior</span> : null}
                  </div>
                </li>
              ))}
            </ol>
            <p className="empty-copy">Los primeros pasos cuentan visitantes anónimos; los dos últimos cuentan jugadores con cuenta. Se excluyen bots y precargas.</p>
          </section>

          <div className="analytics-grid">
            <RankedList rows={summary.sports} title="Deportes más buscados" />
            <RankedList rows={summary.zones} title="Zonas más buscadas" />
          </div>

          <section className="private-card dashboard-section">
            <p className="eyebrow">Complejos</p>
            <h2>Vistas y reservas por complejo</h2>
            {summary.venues.length ? (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead><tr><th scope="col">Complejo</th><th scope="col">Vistas</th><th scope="col">Reservas</th><th scope="col">Conversión</th></tr></thead>
                  <tbody>
                    {summary.venues.map((venue) => (
                      <tr key={venue.label}><th scope="row">{venue.label}</th><td>{venue.views}</td><td>{venue.confirmed}</td><td>{percent(venue.confirmed, venue.views)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="empty-copy">Todavía no hay vistas de complejos en este periodo.</p>}
          </section>
        </>
      )}
    </PrivateShell>
  );
}
