"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight, Download, BarChart2, TrendingUp, MapPin, FileCheck, Activity } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { CreditGauge }       from "../../../components/dashboard/CreditGauge";
import { DashboardHeader }    from "../../../components/dashboard/DashboardHeader";
import { SubScoreCard }       from "../../../components/dashboard/SubScoreCard";
import { LoanBanner }         from "../../../components/dashboard/LoanBanner";
import { RiskBadge }          from "../../../components/dashboard/RiskBadge";
import { RadarChart }         from "../../../components/dashboard/RadarChart";
import { ScoreBreakdownBar }  from "../../../components/dashboard/ScoreBreakdownBar";
import { AIExplanationCard }  from "../../../components/dashboard/AIExplanationCard";
import { ChatDrawer }         from "../../../components/chat/ChatDrawer";

gsap.registerPlugin(useGSAP);

// ─── Mock data (diganti API real nanti) ──────────────────────────────────────
const MOCK_SESSIONS: Record<string, any> = {
  "session-demo-001": {
    umkmName: "Warung Sembako Bu Sari",
    sessionDate: "23 April 2026",
    creditScore: 712,
    subScores: {
      financial:    { score: 72, weight: "35%", label: "Kapasitas Finansial", icon: "💰", stateDesc: "Kekuatan Cashflow", stateValue: "Stabil", status: "good" as const },
      experience:   { score: 65, weight: "20%", label: "Rekam Jejak Usaha", icon: "🏪", stateDesc: "Rekam Jejak", stateValue: "Cukup Baik", status: "info" as const },
      location:     { score: 78, weight: "15%", label: "Kestrategisan Lokasi", icon: "📍", stateDesc: "Potensi Lokasi", stateValue: "Strategis", status: "good" as const },
      document:     { score: 80, weight: "15%", label: "Validitas Dokumen", icon: "📄", stateDesc: "Validitas Berkas", stateValue: "Terverifikasi", status: "good" as const },
      character:    { score: 60, weight: "15%", label: "Profil Karakter", icon: "🤝", stateDesc: "Profil Karakter", stateValue: "Perlu Diperkuat", status: "warning" as const },
    },
    loanAmount: "Rp 28.400.000",
    isEligible: true,
    explanation:
      "Berdasarkan analisis menyeluruh terhadap data wawancara dan dokumen yang diunggah, bisnis Warung Sembako Bu Sari menunjukkan profil kredit yang cukup kuat dengan skor 712. Kekuatan utama terletak pada konsistensi dokumen usaha (skor 80/100) dan lokasi strategis (78/100). Arus kas bulanan yang stabil di kisaran Rp 12–15 juta menjadi fondasi yang baik. Saran utama: tingkatkan kelengkapan catatan keuangan digital untuk membuka akses plafon yang lebih tinggi.",
  },
  "session-demo-002": {
    umkmName: "Toko Online Budi Jaya",
    sessionDate: "22 April 2026",
    creditScore: 641,
    subScores: {
      financial:    { score: 58, weight: "35%", label: "Kapasitas Finansial", icon: "💰", stateDesc: "Kekuatan Cashflow", stateValue: "Berfluktuasi", status: "warning" as const },
      experience:   { score: 70, weight: "20%", label: "Rekam Jejak Usaha", icon: "🏪", stateDesc: "Rekam Jejak", stateValue: "Solid", status: "good" as const },
      location:     { score: 60, weight: "15%", label: "Kestrategisan Lokasi", icon: "📍", stateDesc: "Potensi Lokasi", stateValue: "Standar", status: "info" as const },
      document:     { score: 85, weight: "15%", label: "Validitas Dokumen", icon: "📄", stateDesc: "Validitas Berkas", stateValue: "Lengkap", status: "good" as const },
      character:    { score: 55, weight: "15%", label: "Profil Karakter", icon: "🤝", stateDesc: "Profil Karakter", stateValue: "Sedang", status: "warning" as const },
    },
    loanAmount: "Rp 15.000.000",
    isEligible: true,
    explanation:
      "Toko Online Budi Jaya memiliki rekam jejak usaha yang solid dan kelengkapan dokumen yang sangat baik. Namun, arus kas yang berfluktuasi menjadi catatan utama yang menurunkan skor finansial ke 58/100. Tren penjualan online memang cenderung naik turun, sehingga kami merekomendasikan plafon pinjaman yang lebih konservatif agar cicilan tetap aman.",
  },
  "session-demo-003": {
    umkmName: "Jasa Ojek Pak Andi",
    sessionDate: "20 April 2026",
    creditScore: 498,
    subScores: {
      financial:    { score: 45, weight: "35%", label: "Kapasitas Finansial", icon: "💰", stateDesc: "Kekuatan Cashflow", stateValue: "Rendah", status: "danger" as const },
      experience:   { score: 50, weight: "20%", label: "Rekam Jejak Usaha", icon: "🏪", stateDesc: "Rekam Jejak", stateValue: "Baru", status: "warning" as const },
      location:     { score: 55, weight: "15%", label: "Kestrategisan Lokasi", icon: "📍", stateDesc: "Potensi Lokasi", stateValue: "Berpindah", status: "info" as const },
      document:     { score: 40, weight: "15%", label: "Validitas Dokumen", icon: "📄", stateDesc: "Validitas Berkas", stateValue: "Minim", status: "danger" as const },
      character:    { score: 65, weight: "15%", label: "Profil Karakter", icon: "🤝", stateDesc: "Profil Karakter", stateValue: "Cukup Baik", status: "info" as const },
    },
    loanAmount: "Rp 0",
    isEligible: false,
    explanation:
      "Profil Jasa Ojek Pak Andi saat ini menunjukkan risiko yang cukup tinggi (skor 498). Tantangan utama ada pada minimnya kelengkapan dokumen verifikasi (40/100) dan kapasitas finansial yang belum stabil. Untuk saat ini pengajuan pinjaman belum dapat dilanjutkan. Saran perbaikan: mulai mencatat pemasukan harian dan kumpulkan foto-foto aktivitas jasa sebagai bukti pendukung di pengajuan berikutnya.",
  }
};

// ─── Page ────────────────────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ session_id: string }>;
}

export default function SessionDashboardPage({ params }: PageProps) {
  const { session_id } = use(params);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sessionData = MOCK_SESSIONS[session_id];

  useGSAP(() => {
    if (!sessionData) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".dash-top",
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.5 }
    )
    .fromTo(".dash-gauge",
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.2)" },
      "-=0.2"
    )
    .fromTo(".dash-card",
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.09 },
      "-=0.2"
    )
    .fromTo(".dash-section",
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
      "-=0.1"
    );
  }, { scope: containerRef, dependencies: [sessionData] });

  if (!sessionData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", backgroundColor: "var(--color-bg)", alignItems: "center", justifyContent: "center" }}>
        <ChatDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <DashboardHeader onOpenDrawer={() => setDrawerOpen(true)} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, color: "var(--color-navy)", marginBottom: 8, fontWeight: 800 }}>Sesi Tidak Ditemukan</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24 }}>Data untuk sesi "{session_id}" obrolan belum tersedia atau sudah kadaluarsa.</p>
          <Link href="/" style={{ padding: "10px 20px", background: "var(--color-accent)", color: "#fff", textDecoration: "none", borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const radarData = [
    { dimension: "Finansial", score: sessionData.subScores.financial.score, fullMark: 100 },
    { dimension: "Pengalaman", score: sessionData.subScores.experience.score, fullMark: 100 },
    { dimension: "Lokasi", score: sessionData.subScores.location.score, fullMark: 100 },
    { dimension: "Dokumen", score: sessionData.subScores.document.score, fullMark: 100 },
    { dimension: "Karakter", score: sessionData.subScores.character.score, fullMark: 100 },
  ];

  const breakdownBars = [
    { label: sessionData.subScores.financial.label,  score: sessionData.subScores.financial.score,  weight: sessionData.subScores.financial.weight, icon: sessionData.subScores.financial.icon, color: "#3B82F6", trackColor: "#EFF6FF" },
    { label: sessionData.subScores.experience.label,    score: sessionData.subScores.experience.score, weight: sessionData.subScores.experience.weight, icon: sessionData.subScores.experience.icon, color: "#8B5CF6", trackColor: "#F5F3FF" },
    { label: sessionData.subScores.location.label, score: sessionData.subScores.location.score,   weight: sessionData.subScores.location.weight, icon: sessionData.subScores.location.icon, color: "#10B981", trackColor: "#ECFDF5" },
    { label: sessionData.subScores.document.label,    score: sessionData.subScores.document.score,   weight: sessionData.subScores.document.weight, icon: sessionData.subScores.document.icon, color: "#F59E0B", trackColor: "#FFFBEB" },
    { label: sessionData.subScores.character.label,      score: sessionData.subScores.character.score,  weight: sessionData.subScores.character.weight, icon: sessionData.subScores.character.icon, color: "#EC4899", trackColor: "#FDF2F8" },
  ];

  const metricCards = [
    { id: 1, title: sessionData.subScores.financial.stateDesc,  value: sessionData.subScores.financial.stateValue, score: sessionData.subScores.financial.score,  status: sessionData.subScores.financial.status, icon: TrendingUp  },
    { id: 2, title: sessionData.subScores.location.stateDesc,     value: sessionData.subScores.location.stateValue, score: sessionData.subScores.location.score,   status: sessionData.subScores.location.status, icon: MapPin      },
    { id: 3, title: sessionData.subScores.experience.stateDesc,        value: sessionData.subScores.experience.stateValue, score: sessionData.subScores.experience.score, status: sessionData.subScores.experience.status, icon: BarChart2   },
    { id: 4, title: sessionData.subScores.document.stateDesc,   value: sessionData.subScores.document.stateValue, score: sessionData.subScores.document.score,   status: sessionData.subScores.document.status, icon: FileCheck   },
    { id: 5, title: sessionData.subScores.character.stateDesc,    value: sessionData.subScores.character.stateValue, score: sessionData.subScores.character.score, status: sessionData.subScores.character.status, icon: Activity    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <ChatDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <DashboardHeader onOpenDrawer={() => setDrawerOpen(true)} />

      <main style={{ display: "flex", flex: 1, justifyContent: "center", width: "100%" }}>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            maxWidth: 960,
            width: "100%",
            borderLeft: "1px solid var(--color-border)",
            borderRight: "1px solid var(--color-border)",
            padding: "28px 24px 64px",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >

          {/* ── Top Bar ─────────────────────────────────────────────────── */}
          <div className="dash-top" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, opacity: 0 }}>
            <div>
              <Link
                href="/chat"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)",
                  marginBottom: 10, transition: "color 0.2s",
                  textDecoration: "none",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--color-accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-muted)"}
              >
                <ArrowLeft size={13} strokeWidth={2.5} />
                Kembali ke Wawancara
              </Link>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-navy)", margin: 0, letterSpacing: "-0.4px" }}>
                {sessionData.umkmName}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                <RiskBadge score={sessionData.creditScore} />
                <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                  Sesi #{session_id.split("-").pop()?.toUpperCase()} · {sessionData.sessionDate}
                </span>
              </div>
            </div>

            <button
              id="btn-export-pdf"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "10px 18px",
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 13, fontWeight: 700,
                color: "var(--color-navy)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.color = "var(--color-accent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.color = "var(--color-navy)";
              }}
              onClick={() => alert("Ekspor PDF akan tersedia setelah backend terhubung.")}
            >
              <Download size={15} strokeWidth={2.5} />
              Ekspor PDF
            </button>
          </div>

          {/* ── Gauge + Quick Metrics ───────────────────────────────────── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "start", justifyContent: "center" }}>
            {/* Gauge */}
            <div className="dash-gauge" style={{ opacity: 0, flexShrink: 0, minWidth: 200, display: "flex", justifyContent: "center" }}>
              <CreditGauge score={sessionData.creditScore} maxScore={850} />
            </div>

            {/* 5 Metric Cards */}
            <div style={{ flex: 1, minWidth: 280, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {metricCards.map(m => (
                <div key={m.id} className="dash-card" style={{ opacity: 0 }}>
                  <SubScoreCard
                    title={m.title}
                    value={m.value}
                    score={m.score}
                    status={m.status}
                    icon={m.icon}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Score Breakdown ─────────────────────────────────────────── */}
          <div className="dash-section" style={{ opacity: 0 }}>
            <SectionTitle>Rincian Skor per Dimensi</SectionTitle>
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 20,
              padding: 24,
            }}>
              <ScoreBreakdownBar subScores={breakdownBars} />
            </div>
          </div>

          {/* ── Radar Chart ─────────────────────────────────────────────── */}
          <div className="dash-section" style={{ opacity: 0 }}>
            <SectionTitle>Profil Radar Kredit</SectionTitle>
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 20,
              padding: "24px 24px 12px",
            }}>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
                Visualisasi keseimbangan 5 dimensi penilaian kredit. Semakin luas area poligon, semakin kuat profil kredit Anda.
              </p>
              <RadarChart data={radarData} />
            </div>
          </div>

          {/* ── AI Explanation ──────────────────────────────────────────── */}
          <div className="dash-section" style={{ opacity: 0 }}>
            <SectionTitle>Penjelasan AI</SectionTitle>
            <AIExplanationCard
              score={sessionData.creditScore}
              riskLabel="Berdasarkan Penilaian"
              explanation={sessionData.explanation}
            />
          </div>

          {/* ── Loan Banner ─────────────────────────────────────────────── */}
          <div className="dash-section" style={{ opacity: 0 }}>
            <SectionTitle>Rekomendasi Pinjaman</SectionTitle>
            <LoanBanner amount={sessionData.loanAmount} isEligible={sessionData.isEligible} />
          </div>

        </div>
      </main>
    </div>
  );
}

// ─── Helper — Section title ───────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 13,
      fontWeight: 800,
      color: "var(--color-text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin: "0 0 12px",
    }}>
      {children}
    </h2>
  );
}
