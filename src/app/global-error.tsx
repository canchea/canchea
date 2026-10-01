"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error global en CANCHEA", error.digest ?? "sin identificador");
  }, [error]);

  return (
    <html lang="es">
      <body style={{ background: "#f4f6f5", color: "#0b0f0e", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <main style={{ alignItems: "center", display: "flex", minHeight: "100vh", padding: 24 }}>
          <section style={{ background: "white", border: "1px solid #dce4e0", borderRadius: 20, margin: "auto", maxWidth: 620, padding: 36, width: "100%" }} role="alert">
            <p style={{ color: "#0f7a40", fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>CANCHEA</p>
            <h1 style={{ fontSize: "clamp(2rem, 7vw, 3.5rem)", letterSpacing: "-.05em", lineHeight: 1, margin: "12px 0" }}>Necesitamos recargar la aplicación</h1>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>No se perdió ninguna acción confirmada. Puedes reintentar ahora o regresar al inicio.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
              <button onClick={reset} style={{ background: "#22c55e", border: 0, borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 800, minHeight: 50, padding: "0 20px" }} type="button">Intentar de nuevo</button>
              <Link href="/" style={{ alignItems: "center", background: "#0b0f0e", borderRadius: 12, color: "white", display: "inline-flex", fontWeight: 800, minHeight: 50, padding: "0 20px", textDecoration: "none" }}>Volver al inicio</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
