import { Logo } from "@/components/logo";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Logo inverted />
        <div>
          <p className="eyebrow eyebrow--light">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <p className="auth-brand-note">Reserva. Juega. Disfruta.</p>
      </section>
      <section className="auth-content-panel">
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
