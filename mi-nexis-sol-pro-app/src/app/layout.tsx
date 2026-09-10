import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Poppins } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE } from "@/lib/config";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.appUrl),
  title: `${SITE.productName} | ${SITE.brandName}`,
  description: "See your home's solar potential in seconds — an instant, homeowner-friendly solar assessment powered by Nexis Power.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: `${SITE.productName} | ${SITE.brandName}`,
    description: "See your home's solar potential in seconds.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b3d4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${poppins.variable}`}>
      <body className="flex min-h-screen flex-col bg-nexis-warm-white">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
