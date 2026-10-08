import Link from "next/link";
import { brand } from "@/config/brand";

export function Logo({
  inverted = false,
  href = "/",
  navigationLabel = "ir al inicio",
}: {
  inverted?: boolean;
  href?: string;
  navigationLabel?: string;
}) {
  return (
    <Link className={`brand-lockup ${inverted ? "brand-lockup--inverted" : ""}`} href={href} aria-label={`${brand.name}, ${navigationLabel}`}>
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span className="brand-wording">
        <strong>{brand.shortName}</strong>
        <small>{brand.tagline}</small>
      </span>
    </Link>
  );
}
