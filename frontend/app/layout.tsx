import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

// Body font — sangat readable untuk teks panjang
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Heading font — modern & tegas untuk judul scoring
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Tahu — Credit Scoring UMKM",
    template: "%s | Tahu",
  },
  description:
    "Platform credit scoring UMKM berbasis AI conversational interview. " +
    "Dapatkan penilaian kredit yang akurat dan adil melalui percakapan natural dengan AI.",
  keywords: ["credit scoring", "UMKM", "AI", "kredit", "pinjaman", "Indonesia"],
  authors: [{ name: "Tahu Team" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Tahu",
    title: "Tahu — Credit Scoring UMKM berbasis AI",
    description:
      "Dapatkan credit score UMKM yang akurat dan adil melalui wawancara AI yang natural.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
