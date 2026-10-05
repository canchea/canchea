import Link from "next/link";
import { Logo } from "@/components/logo";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Logo inverted /><p>Más deporte. Más momentos.</p></div>
        <div><h2>Explora</h2><Link href="/complejos">Complejos verificados</Link><Link href="/#valoradas">Mejor valoradas</Link><Link href="/#nuevos">Nuevos complejos</Link></div>
        <div><h2>Deportes</h2><span>Fútbol</span><span>Pádel</span><span>Wally</span></div>
        <div><h2>Información</h2><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link><Link href="/cancelaciones">Cancelaciones</Link><Link href="/soporte">Soporte</Link></div>
        <div><h2>Ciudad inicial</h2><span>{brand.city}</span><span>{brand.country}</span></div>
      </div>
      <div className="container footer-bottom"><p>© {new Date().getFullYear()} {brand.name}. Reserva. Juega. Disfruta.</p><p>Piloto web con pagos de prueba.</p></div>
    </footer>
  );
}
