import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { brand } from "@/config/brand";
import { getSiteUrl } from "@/lib/supabase/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${brand.name} | ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  keywords: ["reservar cancha", "canchas Santa Cruz", "fútbol", "pádel", "wally", "Bolivia"],
  openGraph: {
    title: `${brand.name} | ${brand.tagline}`,
    description: brand.description,
    locale: brand.locale,
    type: "website",
    images: [{
      url: "/images/hero-canchea.png",
      width: 1672,
      height: 941,
      alt: "Amigos llegando a un complejo deportivo en Santa Cruz",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} | ${brand.tagline}`,
    description: brand.description,
    images: ["/images/hero-canchea.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
