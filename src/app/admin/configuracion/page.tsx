import type { Metadata } from "next";
import { updatePlatformSettingAction } from "@/app/admin/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { adminNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configuración de plataforma", robots: { index: false, follow: false } };

const labels: Record<string, string> = {
  booking_hold_minutes: "Duración del hold (minutos)",
  booking_min_advance_minutes: "Anticipación mínima (minutos)",
  booking_deposit_amount: "Reserva mínima (Bs)",
  platform_commission_percentage: "Comisión CANCHEA (%)",
  cancellation_threshold_hours: "Umbral de cancelación temprana (horas)",
  deposit_refund_amount: "Devolución temprana (Bs)",
  cancellation_penalty_amount: "Penalización temprana (Bs)",
  cancellation_venue_share_percentage: "Parte de penalización para complejo (%)",
  review_window_days: "Ventana para valorar (días)",
  complaint_window_days: "Ventana para reclamar (días)",
  reminder_hours_before_booking: "Recordatorio previo (horas)",
  trial_months: "Prueba gratuita (meses)",
  mock_payments_enabled: "Pagos simulados habilitados",
};

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireRole("super_admin");
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("key, value, description, is_public, updated_at").order("key");
  const settings = data ?? [];
  return <PrivateShell title="Configuración global" description="Reglas centralizadas; los cambios impactan las nuevas operaciones de toda la plataforma." links={[...adminNavigation]}>
    {query.estado === "ok" ? <div className="page-notice page-notice--success">La configuración fue actualizada.</div> : null}
    {query.estado === "error" ? <div className="page-notice page-notice--error">El valor no es válido o esa clave no puede modificarse.</div> : null}
    <div className="settings-grid">{settings.map((setting) => {
      const value = typeof setting.value === "boolean" ? String(setting.value) : String(setting.value);
      const isBoolean = value === "true" || value === "false";
      const editable = setting.key in labels;
      return <article className="private-card setting-card" key={setting.key}><div><p className="eyebrow">{setting.is_public ? "Público" : "Interno"}</p><h2>{labels[setting.key] ?? setting.key}</h2><p>{setting.description}</p></div>{editable ? <form action={updatePlatformSettingAction}><input name="key" type="hidden" value={setting.key} />{isBoolean ? <select defaultValue={value} name="value"><option value="true">Sí</option><option value="false">No</option></select> : <input defaultValue={value} min="0" name="value" required step="0.01" type="number" />}<button className="button button--primary" type="submit">Guardar</button></form> : <strong className="setting-readonly">{value}</strong>}</article>;
    })}</div>
    <div className="page-notice page-notice--error">Antes de producción debes deshabilitar los pagos simulados y conectar un proveedor real. CANCHEA no almacena tarjetas ni credenciales bancarias.</div>
  </PrivateShell>;
}
