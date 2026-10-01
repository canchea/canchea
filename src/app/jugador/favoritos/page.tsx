import type { Metadata } from "next";
import Link from "next/link";
import { toggleCourtFavoriteAction, toggleVenueFavoriteAction } from "@/app/jugador/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { playerNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis favoritos", robots: { index: false, follow: false } };

export default async function FavoritesPage() {
  const account = await requireRole("player");
  const supabase = await createClient();
  const [venuesResult, courtsResult] = await Promise.all([
    supabase.from("favorite_venues").select("venue_id, created_at, venues(commercial_name, slug, zone, city, rating_average, review_count)").eq("player_id", account.user.id).order("created_at", { ascending: false }),
    supabase.from("favorite_courts").select("court_id, created_at, courts(name, slug, venues(commercial_name, slug, zone), sports(name), sport_modalities(name))").eq("player_id", account.user.id).order("created_at", { ascending: false }),
  ]);

  return <PrivateShell title="Mis favoritos" description="Tus complejos y canchas guardadas para reservar más rápido." links={[...playerNavigation]}><div className="dashboard-two-columns"><section className="private-card dashboard-section"><p className="eyebrow">Complejos</p><h2>Guardados</h2><div className="favorite-list">{(venuesResult.data ?? []).map((item) => <article key={item.venue_id}><div><strong>{item.venues?.commercial_name}</strong><span>{item.venues?.zone}, {item.venues?.city}</span><small>★ {Number(item.venues?.rating_average ?? 0).toFixed(1)} · {item.venues?.review_count ?? 0} reseñas</small></div><div><Link href={`/complejos/${item.venues?.slug}`}>Ver</Link><form action={toggleVenueFavoriteAction}><input name="venue_id" type="hidden" value={item.venue_id} /><input name="return_path" type="hidden" value="/jugador/favoritos" /><button type="submit">Quitar</button></form></div></article>)}</div>{!venuesResult.data?.length ? <p className="empty-copy">Aún no guardaste complejos.</p> : null}</section><section className="private-card dashboard-section"><p className="eyebrow">Canchas</p><h2>Guardadas</h2><div className="favorite-list">{(courtsResult.data ?? []).map((item) => <article key={item.court_id}><div><strong>{item.courts?.name}</strong><span>{item.courts?.venues?.commercial_name} · {item.courts?.sports?.name}</span></div><div><Link href={`/complejos/${item.courts?.venues?.slug}#cancha-${item.court_id}`}>Ver</Link><form action={toggleCourtFavoriteAction}><input name="court_id" type="hidden" value={item.court_id} /><input name="return_path" type="hidden" value="/jugador/favoritos" /><button type="submit">Quitar</button></form></div></article>)}</div>{!courtsResult.data?.length ? <p className="empty-copy">Aún no guardaste canchas.</p> : null}</section></div></PrivateShell>;
}
