"use client";

import { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, TrendingUp, MapPin, FileCheck, ShieldCheck, BarChart2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { CreditGauge } from "../../components/dashboard/CreditGauge";
import { SubScoreCard } from "../../components/dashboard/SubScoreCard";
import { LoanBanner } from "../../components/dashboard/LoanBanner";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { RiskBadge } from "../../components/dashboard/RiskBadge";
import { ChatDrawer } from "../../components/chat/ChatDrawer";
import { DashboardSkeleton } from "../../components/dashboard/LoadingSkeleton";
import { useAuth } from "../../lib/auth-context";
import {
  listBusinesses,
  getBusinessAssessments,
  BusinessResponse,
  CreditAssessment,
  AssessmentSummary,
} from "../../lib/api";

gsap.registerPlugin(useGSAP);

// ── Score helpers ─────────────────────────────────────────────

function getRiskColor(riskLevel: string) {
  const map: Record<string, string> = {
    "Very Low": "#15803d",
    Low: "#0891b2",
    Medium: "#b45309",
    High: "#c2410c",
    "Very High": "#b91c1c",
  };
  return map[riskLevel] ?? "#8A8A84";
}

function formatRupiah(amount: number | null | undefined): string {
  if (!amount || amount === 0) return "Tidak Eligible";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "-";
  try {
    return new Date(isoStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

// ── Component ─────────────────────────────────────────────────

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { isLoggedIn, token } = useAuth();

  // Data state
  const [business, setBusiness] = useState<BusinessResponse | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<CreditAssessment | null>(null);
  const [latestSessionDate, setLatestSessionDate] = useState<string | null>(null);
  const [latestSessionId, setLatestSessionId] = useState<string | null>(null);
  const [hasAssessment, setHasAssessment] = useState(false);

  // ── Fetch data from backend ─────────────────────────────────

  useEffect(() => {
    setIsMounted(true);
    if (!isLoggedIn || !token) {
      setIsFetching(false);
      return;
    }
    fetchDashboardData(token);
  }, [isLoggedIn, token]);

  const fetchDashboardData = async (authToken: string) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      // 1. Get user's businesses
      const businesses = await listBusinesses(authToken);
      if (!businesses.length) {
        setHasAssessment(false);
        setIsFetching(false);
        return;
      }

      const biz = businesses[0];
      setBusiness(biz);

      // 2. Get assessment history for that business
      const assessments = await getBusinessAssessments(biz.id, authToken);

      // Find the most recent completed assessment
      const completed = assessments.filter(
        (a) => a.status === "completed" && a.credit_assessments
      );

      if (!completed.length) {
        setHasAssessment(false);
        setIsFetching(false);
        return;
      }

      const latest = completed[0]; // already ordered desc by created_at from backend
      setLatestSessionId(latest.id);
      setLatestSessionDate(latest.created_at);
      setLatestAssessment(latest.credit_assessments);
      setHasAssessment(true);
    } catch (e: any) {
      console.error("Dashboard fetch error:", e);
      setFetchError("Gagal memuat data. Pastikan backend berjalan di localhost:8000.");
    } finally {
      setIsFetching(false);
    }
  };

  // ── GSAP animations ─────────────────────────────────────────

  useGSAP(() => {
    if (!isMounted || !hasAssessment || isFetching) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(".dashboard-hero", { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" })
      .to(".dashboard-metric", { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, "-=0.2")
      .to(".dashboard-cta", { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.1)" }, "-=0.1")
      .to(".dash-detail-btn", { opacity: 1, y: 0, duration: 0.4 }, "-=0.1");
  }, { scope: containerRef, dependencies: [isMounted, hasAssessment, isFetching] });

  // ── Build sub-score metrics ──────────────────────────────────

  function buildMetrics(a: CreditAssessment) {
    const toStatus = (score: number | null) => {
      if (!score) return "info" as const;
      if (score >= 70) return "good" as const;
      if (score >= 50) return "info" as const;
      return "warn" as const;
    };

    return [
      {
        id: 1,
        title: "Kapasitas Keuangan",
        value: a.score_financial ? `${Math.round(a.score_financial)}/100` : "-",
        score: Math.round(a.score_financial ?? 0),
        status: toStatus(a.score_financial),
        icon: TrendingUp,
      },
      {
        id: 2,
        title: "Potensi Lokasi",
        value: a.score_location ? `${Math.round(a.score_location)}/100` : "-",
        score: Math.round(a.score_location ?? 0),
        status: toStatus(a.score_location),
        icon: MapPin,
      },
      {
        id: 3,
        title: "Kelengkapan Dokumen",
        value: a.score_collateral ? `${Math.round(a.score_collateral)}/100` : "-",
        score: Math.round(a.score_collateral ?? 0),
        status: toStatus(a.score_collateral),
        icon: FileCheck,
      },
      {
        id: 4,
        title: "Karakter & Reputasi",
        value: a.score_character ? `${Math.round(a.score_character)}/100` : "-",
        score: Math.round(a.score_character ?? 0),
        status: toStatus(a.score_character),
        icon: ShieldCheck,
      },
    ];
  }

  // ── Render states ─────────────────────────────────────────

  let mainContent;

  if (isFetching) {
    mainContent = (
      <div style={{ padding: "32px 24px" }}>
        <DashboardSkeleton />
      </div>
    );
  } else if (fetchError) {
    mainContent = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF1F0", border: "1.5px solid #FFCCC7", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
        </div>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--color-navy)", marginBottom: 8, fontWeight: 700 }}>Koneksi Bermasalah</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.6, maxWidth: 320 }}>{fetchError}</p>
        </div>
        <button
          onClick={() => token && fetchDashboardData(token)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          <RefreshCw size={14} /> Coba Lagi
        </button>
      </div>
    );
  } else if (!isLoggedIn) {
    mainContent = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 16 }}>
        <h2 style={{ fontSize: 20, color: "var(--color-navy)", fontWeight: 800 }}>Silakan Login Dulu</h2>
        <Link href="/chat" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "var(--color-accent)", color: "#fff", textDecoration: "none", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
          Mulai dari Chat <ArrowRight size={14} />
        </Link>
      </div>
    );
  } else if (!hasAssessment) {
    mainContent = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-surface)", border: "1.5px dashed var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart2 size={24} color="var(--color-text-muted)" />
        </div>
        <div>
          <h2 style={{ fontSize: 20, color: "var(--color-navy)", marginBottom: 8, fontWeight: 800 }}>Belum Ada Data Penilaian</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 0, maxWidth: 320, lineHeight: 1.5 }}>
            {business
              ? `Bisnis "${business.business_name}" sudah terdaftar. Selesaikan wawancara AI untuk mendapatkan skor kredit.`
              : "Mulai obrolan santai dengan RINA untuk mendapatkan analisis lengkap kekuatan usahamu."}
          </p>
        </div>
        <Link href="/chat" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "var(--color-accent)", color: "#fff", textDecoration: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"} onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}>
          Cek Skor Kredit Sekarang
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>
    );
  } else if (latestAssessment) {
    const metrics = buildMetrics(latestAssessment);
    const loanAmount = formatRupiah(latestAssessment.loan_max_amount);
    const sessionUrl = latestSessionId ? `/dashboard/${latestSessionId}` : "/dashboard";

    mainContent = (
      <div ref={containerRef} style={{ padding: "28px 20px 64px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Title + latest session badge */}
        <div className="dashboard-hero" style={{ opacity: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-navy)", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
              Ringkasan Penilaian
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <RiskBadge score={latestAssessment.final_score} />
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                {business?.business_name ?? "Usahamu"} · {formatDate(latestSessionDate)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link
              href={sessionUrl}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px",
                background: "var(--color-accent)", color: "#fff",
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                textDecoration: "none", transition: "background 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
            >
              <BarChart2 size={15} strokeWidth={2} />
              Laporan Lengkap
              <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* Gauge */}
        <section>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
              Skor kredit berdasarkan data wawancara dengan RINA
            </p>
          </div>
          <CreditGauge score={latestAssessment.final_score} maxScore={850} />
        </section>

        {/* Metrics grid */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Rincian 4 Pilar Utama
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            {metrics.map(m => (
              <div key={m.id} className="dashboard-metric" style={{ opacity: 0, transform: "translateY(14px)" }}>
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
        </section>

        {/* Loan CTA */}
        <section className="dashboard-cta" style={{ opacity: 0, transform: "translateY(14px)" }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Rekomendasi Pinjaman
          </h2>
          <LoanBanner amount={loanAmount} isEligible={latestAssessment.loan_eligible} />
        </section>

        {/* Data quality badge */}
        {latestAssessment.data_flag === "insufficient" && (
          <div style={{ padding: "12px 16px", background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Data Kurang Lengkap</div>
              <div style={{ fontSize: 12, color: "#78350F", lineHeight: 1.4 }}>
                Skor dihitung dengan data terbatas. Lengkapi profil usaha untuk hasil lebih akurat.
              </div>
            </div>
          </div>
        )}

        {/* Fraud flag warning */}
        {latestAssessment.fraud_flag && (
          <div style={{ padding: "12px 16px", background: "#FFF1F0", border: "1.5px solid #FFCCC7", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>🔍</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>Perlu Verifikasi Manual</div>
              <div style={{ fontSize: 12, color: "#7F1D1D", lineHeight: 1.4 }}>
                Terdeteksi anomali data. Skor dibatasi dan perlu verifikasi tambahan.
              </div>
            </div>
          </div>
        )}

        {/* Teaser to full report */}
        <div
          className="dash-detail-btn"
          style={{
            opacity: 0, transform: "translateY(12px)",
            background: "var(--color-surface)",
            border: "1.5px dashed var(--color-border)",
            borderRadius: 16, padding: "20px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-navy)", marginBottom: 4 }}>
              Radar Chart &amp; Analisis AI tersedia
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Breakdown lengkap 5 dimensi, GCS {latestAssessment.gcs ? (latestAssessment.gcs * 100).toFixed(0) + "%" : "-"}, dan histori sesi.
            </div>
          </div>
          <Link
            href={sessionUrl}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "9px 16px",
              background: "var(--color-bg)",
              border: "1.5px solid var(--color-border)",
              borderRadius: 10, fontSize: 13, fontWeight: 700,
              color: "var(--color-navy)", textDecoration: "none",
              transition: "all 0.2s", whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-navy)"; }}
          >
            Buka Laporan
            <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Start new session */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/chat"
            style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Mulai penilaian ulang →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", backgroundColor: "var(--color-bg)", flexDirection: "column" }}>
      <ChatDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <DashboardHeader onOpenDrawer={() => setDrawerOpen(true)} />

      <main style={{ display: "flex", flex: 1, justifyContent: "center", width: "100%" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 950, width: "100%", backgroundColor: "var(--color-bg)", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)", minHeight: "100%" }}>
          {mainContent}
        </div>
      </main>
    </div>
  );
}
