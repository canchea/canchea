"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function secondsRemaining(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(() => secondsRemaining(expiresAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = secondsRemaining(expiresAt);
      setSeconds(next);
      if (next === 0) {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, router]);

  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="hold-countdown" aria-live="polite">
      <span>Estamos guardando este horario mientras completas tu reserva.</span>
      <strong>{minutes}:{remainder}</strong>
    </div>
  );
}
