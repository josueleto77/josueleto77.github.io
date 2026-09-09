import type { Metadata } from "next";
import { Manrope, Fredoka } from "next/font/google";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

// Wordmark-only display face — used solely by the Logo component, kept
// separate from the Manrope UI font used everywhere else.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: {
    default: "Redormi — Stay. Rest. Redormi.",
    template: "%s | Redormi",
  },
  description:
    "Redormi is a travel-accommodation marketplace for short-term rentals and Redormi Switch, reciprocal home exchanges between verified owners.",
  openGraph: {
    title: "Redormi — Stay. Rest. Redormi.",
    description:
      "Book curated short-term rentals or swap homes with Redormi Switch — no rent, just a home for a home.",
    siteName: "Redormi",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${fredoka.variable} antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
