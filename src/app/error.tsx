"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error de interfaz en CANCHEA", error.digest ?? "sin identificador");
  }, [error]);

  return (
    <main className="error-page">
      <section className="error-card" role="alert">
        <span className="error-code">Algo salió mal</span>
        <h1>No pudimos cargar esta pantalla</h1>
        <p>Tu información sigue segura. Intenta nuevamente o vuelve al inicio para continuar.</p>
        <div className="error-actions">
          <button className="button button--primary" onClick={reset} type="button">Intentar de nuevo</button>
          <Link className="button button--dark" href="/">Volver al inicio</Link>
        </div>
      </section>
    </main>
  );
}
