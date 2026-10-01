import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinationForRole, safeInternalPath } from "@/lib/auth/routes";
import { getSiteUrl } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = new URL(getSiteUrl()).origin;
  const code = searchParams.get("code");
  const requestedNext = safeInternalPath(searchParams.get("next"), "");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/iniciar-sesion?estado=oauth-error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/iniciar-sesion?estado=oauth-error`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const destination = requestedNext || destinationForRole(profile?.role ?? null);
  return NextResponse.redirect(`${origin}${destination}`);
}
