import Link from "next/link";
import { navigation } from "@/config/brand";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/ui/icon";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Navegación principal">
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="login-link" href="/auth/iniciar-sesion"><Icon name="user" size={18} /><span>Ingresar</span></Link>
          <Link className="button button--dark header-cta" href="/auth/registro">Publica tu complejo</Link>
        </div>
      </div>
    </header>
  );
}
