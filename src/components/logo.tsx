import Link from "next/link";
import { brand } from "@/config/brand";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link className={`brand-lockup ${inverted ? "brand-lockup--inverted" : ""}`} href="/" aria-label={`${brand.name}, ir al inicio`}>
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span className="brand-wording">
        <strong>{brand.shortName}</strong>
        <small>{brand.tagline}</small>
      </span>
    </Link>
  );
}
