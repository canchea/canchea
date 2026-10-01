import Link from "next/link";
import { Logo } from "@/components/logo";

export function PrivateShell({
  title,
  description,
  children,
  links = [],
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  links?: { href: string; label: string }[];
}) {
  return (
    <main className="private-page">
      <header className="private-topbar">
        <Logo />
        <nav aria-label="Cuenta">
          {links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
          <Link href="/cuenta">Mi perfil</Link>
          <form action="/auth/cerrar-sesion" method="post"><button type="submit">Cerrar sesión</button></form>
        </nav>
      </header>
      <div className="private-container">
        <section className="private-heading">
          <p className="eyebrow">Área protegida</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </section>
        {children}
      </div>
    </main>
  );
}
