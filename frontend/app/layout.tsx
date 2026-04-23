import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Tahu — Nilai Kredit UMKM Berbasis AI",
    template: "%s | Tahu",
  },
  description:
    "Platform penilaian kredit UMKM berbasis wawancara AI yang natural. " +
    "Tidak perlu formulir panjang — cukup ceritakan usahamu, dapatkan skor kredit dalam hitungan menit.",
  keywords: ["kredit UMKM", "skor kredit", "pinjaman usaha", "AI kredit", "wawancara kredit", "platform UMKM", "Indonesia"],
  authors: [{ name: "Tim Tahu" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Tahu",
    title: "Tahu — Nilai Kredit UMKM Berbasis AI",
    description: "Dapatkan penilaian kredit UMKM yang akurat dan adil melalui wawancara AI yang natural dan santai.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
