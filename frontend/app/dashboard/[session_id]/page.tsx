import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard Credit Score",
  description: "Hasil credit scoring UMKM — breakdown per dimensi dan rekomendasi pinjaman",
};

interface DashboardPageProps {
  params: Promise<{ session_id: string }>;
}

/**
 * Dashboard Page — Halaman hasil credit scoring
 *
 * Komponen penuh (Speedometer, Radar Chart, Breakdown Cards, PDF Export)
 * akan diimplementasikan di Day 7.
 *
 * Saat ini menampilkan shell layout yang sudah final.
 */
export default async function DashboardPage({ params }: DashboardPageProps) {
  const { session_id } = await params;

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/chat"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2 inline-block"
          >
            ← Kembali ke Wawancara
          </Link>
          <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: "var(--font-sora)" }}>
            Hasil Credit Scoring
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Session: {session_id}
          </p>
        </div>
        <button
          id="btn-export-pdf"
          disabled
          className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-400 cursor-not-allowed opacity-40"
        >
          📄 Export PDF (Day 7)
        </button>
      </div>

      {/* Score Card Placeholder */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Main Score */}
        <div className="glass-card p-8 flex flex-col items-center justify-center lg:col-span-1">
          {/* Speedometer placeholder */}
          <div className="w-40 h-40 rounded-full border-4 border-slate-700 flex flex-col items-center justify-center mb-4 relative">
            <div className="text-4xl font-extrabold gradient-text" style={{ fontFamily: "var(--font-sora)" }}>
              —
            </div>
            <div className="text-xs text-slate-500">Credit Score</div>
          </div>
          <div className="text-sm font-medium text-slate-400 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-900">
            Menunggu Hasil Wawancara
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center">
            Speedometer interaktif tersedia Day 7
          </p>
        </div>

        {/* Sub-scores Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: "Finansial", weight: "35%", icon: "💰", color: "from-blue-500 to-indigo-500" },
            { label: "Pengalaman", weight: "20%", icon: "🏪", color: "from-violet-500 to-purple-500" },
            { label: "Lokasi", weight: "15%", icon: "📍", color: "from-emerald-500 to-teal-500" },
            { label: "Dokumen", weight: "15%", icon: "📄", color: "from-amber-500 to-orange-500" },
            { label: "Karakter", weight: "15%", icon: "🤝", color: "from-pink-500 to-rose-500" },
          ].map((dim) => (
            <div key={dim.label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span>{dim.icon}</span>
                <span className="text-sm font-medium text-slate-200">{dim.label}</span>
                <span className="ml-auto text-xs text-slate-500">{dim.weight}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full w-0 bg-gradient-to-r ${dim.color} rounded-full`} />
              </div>
              <div className="text-right text-xs text-slate-600 mt-1">— / 100</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radar Chart Placeholder */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4" style={{ fontFamily: "var(--font-sora)" }}>
          Radar Chart — Semua Dimensi
        </h2>
        <div className="h-48 flex items-center justify-center text-slate-600 text-sm border border-dashed border-slate-700 rounded-xl">
          Recharts Spider Chart tersedia mulai Day 7
        </div>
      </div>

      {/* Loan Recommendation Placeholder */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4" style={{ fontFamily: "var(--font-sora)" }}>
          Rekomendasi Pinjaman
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Plafon Maksimal", value: "—", icon: "💵" },
            { label: "Tenor Disarankan", value: "—", icon: "📅" },
            { label: "Kisaran Bunga", value: "—", icon: "%" },
          ].map((item) => (
            <div key={item.label} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="text-xl mb-2">{item.icon}</div>
              <div className="text-xs text-slate-500 mb-1">{item.label}</div>
              <div className="text-xl font-bold text-slate-300">{item.value}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-4">
          Data rekomendasi akan terisi setelah wawancara selesai (Day 6–7)
        </p>
      </div>
    </div>
  );
}
