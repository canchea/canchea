import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { VenueSwitcher } from "@/components/venues/venue-switcher";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerVenues } from "@/lib/venues/owner";
import type { VenueWalletTransactionKind } from "@/types/database";

export const metadata: Metadata = { title: "Saldo CANCHEA", robots: { index: false, follow: false } };

const transactionLabels: Record<VenueWalletTransactionKind, string> = {
  pilot_credit: "Crédito inicial",
  top_up: "Recarga",
  commission_hold: "Comisión retenida",
  commission_release: "Comisión liberada",
  commission_capture: "Comisión cobrada",
  adjustment: "Ajuste",
};

const positiveKinds = new Set<VenueWalletTransactionKind>(["pilot_credit", "top_up", "commission_release"]);

function formatBob(value: number) {
  return new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default async function OwnerBillingPage() {
  const account = await requireRole("venue_owner");
  const supabase = await createClient();
  const { venues, activeVenueId } = await getOwnerVenues(account.user.id);
  const venue = venues.find((item) => item.id === activeVenueId);

  const [{ data: billing }, { data: transactions }] = activeVenueId ? await Promise.all([
    supabase.from("venue_billing_accounts").select("available_balance_bob, reserved_balance_bob, status, low_balance_threshold_bob, updated_at").eq("venue_id", activeVenueId).maybeSingle(),
    supabase.from("venue_wallet_transactions").select("id, kind, amount_bob, reference, description, available_balance_after_bob, reserved_balance_after_bob, created_at").eq("venue_id", activeVenueId).order("created_at", { ascending: false }).limit(100),
  ]) : [{ data: null }, { data: [] }];

  const statusLabel = billing?.status === "active" ? "Activo" : billing?.status === "low_balance" ? "Saldo bajo" : "Reservas pausadas";

  return (
    <PrivateShell title="Saldo CANCHEA" description="Controla el fondo prepago que cubre las comisiones de tus reservas." links={[...ownerNavigation]}>
      <VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/facturacion" venues={venues} />

      {!venue ? (
        <section className="private-card booking-unavailable">
          <h2>Primero registra un complejo</h2>
          <p>El saldo CANCHEA se habilita cuando el complejo es aprobado.</p>
          <Link className="button button--primary" href="/propietario">Registrar complejo</Link>
        </section>
      ) : !billing ? (
        <section className="private-card booking-unavailable">
          <h2>Saldo pendiente de activación</h2>
          <p>El fondo se habilitará automáticamente cuando {venue.commercial_name} sea aprobado.</p>
          <Link className="button button--secondary" href="/propietario">Ver estado del complejo</Link>
        </section>
      ) : (
        <>
          <section className="billing-balance-hero">
            <div>
              <p className="eyebrow">Disponible para nuevas reservas</p>
              <strong>Bs {formatBob(Number(billing.available_balance_bob))}</strong>
              <span className={`booking-status booking-status--${billing.status === "suspended" ? "cancelled" : billing.status === "low_balance" ? "pending_payment" : "confirmed"}`}>{statusLabel}</span>
            </div>
            <div>
              <span>Comisiones retenidas</span>
              <strong>Bs {formatBob(Number(billing.reserved_balance_bob))}</strong>
              <small>Se cobran al completar la reserva o vuelven al saldo si se cancela.</small>
            </div>
          </section>

          {billing.status !== "active" ? (
            <div className={`page-notice ${billing.status === "suspended" ? "page-notice--error" : ""}`}>
              {billing.status === "suspended"
                ? "Las nuevas reservas públicas están pausadas hasta que recargues saldo."
                : `Tu saldo llegó al nivel de aviso de Bs ${formatBob(Number(billing.low_balance_threshold_bob))}.`}
            </div>
          ) : null}

          <section className="private-card dashboard-section billing-how-it-works">
            <div className="section-heading-inline"><div><p className="eyebrow">Modelo simple</p><h2>Cómo funciona</h2></div></div>
            <ol className="steps-list">
              <li><span>01</span><div><strong>El jugador reserva gratis</strong><p>CANCHEA separa del saldo del complejo el 10% del precio.</p></div></li>
              <li><span>02</span><div><strong>Cobras en tu complejo</strong><p>El jugador te paga el precio completo cuando llega a jugar.</p></div></li>
              <li><span>03</span><div><strong>Finalizas la reserva</strong><p>La comisión retenida se cobra. Si cancelan o no asisten, se libera.</p></div></li>
            </ol>
            <p>Durante el piloto las recargas se verifican manualmente. Envía el comprobante y el nombre del complejo a <a href="mailto:somoscanchea@gmail.com?subject=Recarga%20saldo%20CANCHEA">somoscanchea@gmail.com</a>.</p>
          </section>

          <section className="private-card dashboard-section">
            <div className="section-heading-inline"><div><p className="eyebrow">Trazabilidad</p><h2>Movimientos</h2></div><span>{transactions?.length ?? 0}</span></div>
            <div className="wallet-transaction-list">
              {(transactions ?? []).map((transaction) => {
                const positive = positiveKinds.has(transaction.kind);
                return (
                  <article key={transaction.id}>
                    <div><strong>{transactionLabels[transaction.kind]}</strong><span>{transaction.description}</span><small>{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(transaction.created_at))} · {transaction.reference}</small></div>
                    <div><strong className={positive ? "wallet-amount wallet-amount--positive" : "wallet-amount"}>{positive ? "+" : "−"} Bs {formatBob(Number(transaction.amount_bob))}</strong><small>Disponible: Bs {formatBob(Number(transaction.available_balance_after_bob))}</small></div>
                  </article>
                );
              })}
            </div>
            {!transactions?.length ? <p className="empty-copy">Todavía no hay movimientos.</p> : null}
          </section>
        </>
      )}
    </PrivateShell>
  );
}
