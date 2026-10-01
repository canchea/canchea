"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export function LocationSortButton({ active }: { active: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "denied">("idle");

  function requestLocation() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams(window.location.search);
        params.set("lat", coords.latitude.toFixed(6));
        params.set("lng", coords.longitude.toFixed(6));
        params.set("orden", "distance");
        params.delete("pagina");
        router.push(`/buscar?${params.toString()}`);
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  return (
    <div className="location-sort">
      <button className={active ? "location-sort-button location-sort-button--active" : "location-sort-button"} disabled={status === "loading"} onClick={requestLocation} type="button">
        <Icon name="location" size={17} />
        {status === "loading" ? "Obteniendo ubicación…" : active ? "Ordenado por distancia" : "Ordenar cerca de mí"}
      </button>
      {status === "denied" ? <small>No pudimos acceder a tu ubicación. Revisa el permiso del navegador.</small> : null}
    </div>
  );
}
