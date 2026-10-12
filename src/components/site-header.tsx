import Link from "next/link";
import { navigation } from "@/config/brand";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/ui/icon";

export function SiteHeader({
  player,
}: {
  player?: {
    firstName: string;
  };
} = {}) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo
          href={player ? "/jugador" : "/"}
          navigationLabel={player ? "ir al inicio de reservas" : "ir al inicio"}
        />
        <nav className="desktop-nav" aria-label="Navegación principal">
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          {player ? (
            <>
              <Link aria-label="Mi perfil" className="login-link player-account-link" href="/cuenta">
                <span className="player-account-avatar" aria-hidden="true">{player.firstName.charAt(0).toUpperCase()}</span>
                <span>{player.firstName}</span>
              </Link>
              <Link className="button button--dark header-cta" href="/jugador/reservas">Mis reservas</Link>
            </>
          ) : (
            <>
              <Link className="login-link" href="/auth/iniciar-sesion"><Icon name="user" size={18} /><span>Ingresar</span></Link>
              <Link className="button button--dark header-cta" href="/auth/registro">Publica tu complejo</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
