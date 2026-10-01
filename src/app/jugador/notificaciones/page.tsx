import type { Metadata } from "next";
import Link from "next/link";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/jugador/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { playerNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notificaciones", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const account = await requireRole("player");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("recipient_id", account.user.id).order("created_at", { ascending: false }).limit(100);
  const notifications = data ?? [];

  return <PrivateShell title="Notificaciones" description="Confirmaciones, cancelaciones, recordatorios y novedades importantes." links={[...playerNavigation]}><section className="private-card dashboard-section"><div className="section-heading-inline"><div><p className="eyebrow">Bandeja</p><h2>{notifications.filter((item) => !item.read_at).length} sin leer</h2></div>{notifications.some((item) => !item.read_at) ? <form action={markAllNotificationsReadAction}><button className="text-action" type="submit">Marcar todas como leídas</button></form> : null}</div>{notifications.length ? <div className="notification-list">{notifications.map((notification) => <article className={notification.read_at ? "" : "notification-unread"} key={notification.id}><div><strong>{notification.title}</strong><p>{notification.body}</p><time>{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(notification.created_at))}</time></div><div>{notification.action_url ? <Link href={notification.action_url}>Abrir</Link> : null}{!notification.read_at ? <form action={markNotificationReadAction}><input name="notification_id" type="hidden" value={notification.id} /><button type="submit">Leída</button></form> : null}</div></article>)}</div> : <p className="empty-copy">No tienes notificaciones todavía.</p>}</section></PrivateShell>;
}
