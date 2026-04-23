"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Download, BarChart2, TrendingUp, MapPin, FileCheck, Activity } from "lucide-react";
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

gsap.registerPlugin(useGSAP);

// ─── Mock data (diganti API real nanti) ──────────────────────────────────────
const MOCK_DATA = {
  umkmName: "Warung Sembako Bu Sari",
  sessionDate: "23 April 2026",
  creditScore: 712,
  subScores: {
    financial:    { score: 72, weight: "35%" },
    experience:   { score: 65, weight: "20%" },
    location:     { score: 78, weight: "15%" },
    document:     { score: 80, weight: "15%" },
    character:    { score: 60, weight: "15%" },
  },
  loanAmount: "Rp 28.400.000",
  isEligible: true,
  explanation:
    "Berdasarkan analisis menyeluruh terhadap data wawancara dan dokumen yang diunggah, bisnis Warung Sembako Bu Sari menunjukkan profil kredit yang cukup kuat dengan skor 712. Kekuatan utama terletak pada konsistensi dokumen usaha (skor 80/100) dan lokasi strategis (78/100). Arus kas bulanan yang stabil di kisaran Rp 12–15 juta menjadi fondasi yang baik. Saran utama: tingkatkan kelengkapan catatan keuangan digital untuk membuka akses plafon yang lebih tinggi.",
};

// Radar data
const radarData = [
  { dimension: "Finansial", score: MOCK_DATA.subScores.financial.score, fullMark: 100 },
  { dimension: "Pengalaman", score: MOCK_DATA.subScores.experience.score, fullMark: 100 },
  { dimension: "Lokasi", score: MOCK_DATA.subScores.location.score, fullMark: 100 },
  { dimension: "Dokumen", score: MOCK_DATA.subScores.document.score, fullMark: 100 },
  { dimension: "Karakter", score: MOCK_DATA.subScores.character.score, fullMark: 100 },
];

// Breakdown bars config
const breakdownBars = [
  { label: "Kapasitas Finansial",  score: MOCK_DATA.subScores.financial.score,  weight: "35%", icon: "💰", color: "#3B82F6", trackColor: "#EFF6FF" },
  { label: "Rekam Jejak Usaha",    score: MOCK_DATA.subScores.experience.score, weight: "20%", icon: "🏪", color: "#8B5CF6", trackColor: "#F5F3FF" },
  { label: "Kestrategisan Lokasi", score: MOCK_DATA.subScores.location.score,   weight: "15%", icon: "📍", color: "#10B981", trackColor: "#ECFDF5" },
  { label: "Validitas Dokumen",    score: MOCK_DATA.subScores.document.score,   weight: "15%", icon: "📄", color: "#F59E0B", trackColor: "#FFFBEB" },
  { label: "Profil Karakter",      score: MOCK_DATA.subScores.character.score,  weight: "15%", icon: "🤝", color: "#EC4899", trackColor: "#FDF2F8" },
];

// SubScore cards
const metricCards = [
  { id: 1, title: "Kekuatan Cashflow",  value: "Stabil",         score: MOCK_DATA.subScores.financial.score,  status: "good"    as const, icon: TrendingUp  },
  { id: 2, title: "Potensi Lokasi",     value: "Strategis",      score: MOCK_DATA.subScores.location.score,   status: "good"    as const, icon: MapPin      },
  { id: 3, title: "Rekam Jejak",        value: "Cukup Baik",     score: MOCK_DATA.subScores.experience.score, status: "info"    as const, icon: BarChart2   },
  { id: 4, title: "Validitas Berkas",   value: "Terverifikasi",  score: MOCK_DATA.subScores.document.score,   status: "good"    as const, icon: FileCheck   },
  { id: 5, title: "Profil Karakter",    value: "Perlu Diperkuat", score: MOCK_DATA.subScores.character.score, status: "warning" as const, icon: Activity    },
];

// ─── Page ────────────────────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ session_id: string }>;
}

export default function SessionDashboardPage({ params }: PageProps) {
  const { session_id } = use(params);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
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
  }, { scope: containerRef });

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <DashboardHeader />

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
                {MOCK_DATA.umkmName}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                <RiskBadge score={MOCK_DATA.creditScore} />
                <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                  Sesi #{session_id} · {MOCK_DATA.sessionDate}
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
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" }}>
            {/* Gauge */}
            <div className="dash-gauge" style={{ opacity: 0 }}>
              <CreditGauge score={MOCK_DATA.creditScore} maxScore={850} />
            </div>

            {/* 5 Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
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
              score={MOCK_DATA.creditScore}
              riskLabel="Risiko Rendah"
              explanation={MOCK_DATA.explanation}
            />
          </div>

          {/* ── Loan Banner ─────────────────────────────────────────────── */}
          <div className="dash-section" style={{ opacity: 0 }}>
            <SectionTitle>Rekomendasi Pinjaman</SectionTitle>
            <LoanBanner amount={MOCK_DATA.loanAmount} isEligible={MOCK_DATA.isEligible} />
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
