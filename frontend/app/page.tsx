import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tahu — Credit Scoring UMKM berbasis AI",
  description:
    "Dapatkan credit score UMKM yang akurat dan adil melalui wawancara AI yang natural. " +
    "Tidak perlu formulir panjang — cukup cerita usahamu.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse, oklch(62% 0.22 250), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-10 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse, oklch(68% 0.22 160), transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl w-full text-center animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-slate-700 bg-slate-900/60 text-sm text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Platform Credit Scoring UMKM berbasis AI
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 tracking-tight">
          <span className="gradient-text">Cerita Usahamu,</span>
          <br />
          <span className="text-slate-100">Kami yang Nilai</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
          Tidak ada formulir panjang. Cukup ngobrol natural dengan AI analis
          kredit kami — dan dapatkan credit score yang{" "}
          <span className="text-slate-200 font-medium">akurat & adil</span>{" "}
          dalam hitungan menit.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/chat"
            id="cta-mulai-wawancara"
            className="btn-primary text-base"
          >
            Mulai Wawancara →
          </Link>
          <Link
            href="#cara-kerja"
            id="cta-pelajari"
            className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-base"
          >
            Pelajari Cara Kerja
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: "< 10 menit", label: "Durasi wawancara" },
            { value: "300–850", label: "Rentang skor kredit" },
            { value: "5 dimensi", label: "Parameter penilaian" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card p-4 text-center"
            >
              <div className="text-xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works section anchor */}
      <section
        id="cara-kerja"
        className="relative z-10 mt-32 max-w-4xl w-full px-4"
      >
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-100">
          Cara Kerja Tahu
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Wawancara AI",
              desc: "Ceritakan usahamu ke AI analis kredit kami. Natural, santai, seperti ngobrol biasa.",
              icon: "💬",
            },
            {
              step: "02",
              title: "Upload Dokumen",
              desc: "Upload foto nota, struk, atau buku kas. Azure OCR ekstrak datanya otomatis.",
              icon: "📄",
            },
            {
              step: "03",
              title: "Dapatkan Skor",
              desc: "Lihat credit score 300–850 dengan breakdown per dimensi dan rekomendasi pinjaman.",
              icon: "📊",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6 flex flex-col gap-3">
              <div className="text-3xl">{item.icon}</div>
              <div className="text-xs font-mono text-slate-500 tracking-widest">
                STEP {item.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-100">
                {item.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-24 mb-8 text-center text-xs text-slate-600">
        © 2026 Tahu · UMKM Credit Scoring Platform · Prototype Sprint
      </footer>
    </main>
  );
}
