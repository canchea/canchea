import Link from "next/link";
import { Logo } from "@/components/logo";

export function PrivateShell({
  title,
  description,
  children,
  links = [],
  hideHeading = false,
  wide = false,
  eyebrow = "Área protegida",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  links?: { href: string; label: string }[];
  hideHeading?: boolean;
  wide?: boolean;
  eyebrow?: string;
}) {
  const primaryLink = links[0];

  return (
    <main className="private-page">
      <header className="private-topbar">
        <Logo
          href={primaryLink?.href ?? "/"}
          navigationLabel={primaryLink ? `ir a ${primaryLink.label}` : "ir al inicio"}
        />
        <nav aria-label="Cuenta">
          {links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
          <Link href="/cuenta">Mi perfil</Link>
          <form action="/auth/cerrar-sesion" method="post"><button type="submit">Cerrar sesión</button></form>
        </nav>
      </header>
      <div className={`private-container${wide ? " private-container--wide" : ""}`}>
        {!hideHeading ? (
          <section className="private-heading">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </section>
        ) : null}
        {children}
      </div>
    </main>
  );
}
