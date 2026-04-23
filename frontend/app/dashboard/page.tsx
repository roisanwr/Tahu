"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, TrendingUp, MapPin, FileCheck, ShieldCheck, BarChart2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { CreditGauge }    from "../../components/dashboard/CreditGauge";
import { SubScoreCard }   from "../../components/dashboard/SubScoreCard";
import { LoanBanner }     from "../../components/dashboard/LoanBanner";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { RiskBadge }      from "../../components/dashboard/RiskBadge";
import { ChatDrawer }     from "../../components/chat/ChatDrawer";
import { DashboardSkeleton } from "../../components/dashboard/LoadingSkeleton";
import { useAuth }        from "../../lib/auth-context";

gsap.registerPlugin(useGSAP);

const DEMO_SESSION = "session-demo-001";

// Latest session mock data
const userData = {
  creditScore: 712,
  metrics: [
    { id: 1, title: "Kekuatan Cashflow",   value: "Stabil",          score: 72, status: "good"    as const, icon: TrendingUp  },
    { id: 2, title: "Potensi Lokasi",      value: "Strategis",       score: 78, status: "good"    as const, icon: MapPin      },
    { id: 3, title: "Kelengkapan Berkas",  value: "Terverifikasi",   score: 80, status: "good"    as const, icon: FileCheck   },
    { id: 4, title: "Keamanan Usaha",      value: "Cukup Terjaga",   score: 65, status: "info"    as const, icon: ShieldCheck },
  ],
  loanAmount: "Rp 28.400.000",
  isEligible: true,
};

export default function DashboardPage() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasSession, setHasSession] = useState(true); // default true for hydration, checked in effect
  const [isMounted, setIsMounted]   = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("tahu_last_session");
    // Di real app, logicnya: fetch dari API. Untuk proto, cek localStorage & status auth.
    setHasSession(!!stored && isLoggedIn);
    
    // Simulate network delay
    const timer = setTimeout(() => setIsFetching(false), 600);
    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  useGSAP(() => {
    if (!isMounted || !hasSession || isFetching) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(".dashboard-hero",   { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" })
      .to(".dashboard-metric", { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, "-=0.2")
      .to(".dashboard-cta",    { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.1)" }, "-=0.1")
      .to(".dash-detail-btn",  { opacity: 1, y: 0, duration: 0.4 }, "-=0.1");
  }, { scope: containerRef });

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", backgroundColor: "var(--color-bg)", flexDirection: "column" }}>

      <ChatDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <DashboardHeader onOpenDrawer={() => setDrawerOpen(true)} />

      <main style={{ display: "flex", flex: 1, justifyContent: "center", width: "100%" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 950, width: "100%", backgroundColor: "var(--color-bg)", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)", minHeight: "100%" }}>

          {isFetching ? (
            <div style={{ padding: "32px 24px" }}>
              <DashboardSkeleton />
            </div>
          ) : isMounted && !hasSession ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-surface)", border: "1.5px dashed var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <BarChart2 size={24} color="var(--color-text-muted)" />
              </div>
              <h2 style={{ fontSize: 20, color: "var(--color-navy)", marginBottom: 8, fontWeight: 800 }}>Belum Ada Data Penilaian</h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24, maxWidth: 320, lineHeight: 1.5 }}>
                Mulai obrolan santai dengan AI kami untuk mendapatkan analisis lengkap kekuatan usahamu dan rekomendasi pinjaman.
              </p>
              <Link href="/chat" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "var(--color-accent)", color: "#fff", textDecoration: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"} onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}>
                Cek Skor Kredit Sekarang
                <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          ) : (
          <div ref={containerRef} style={{ padding: "28px 20px 64px", display: "flex", flexDirection: "column", gap: 32 }}>

            {/* Title + latest session badge */}
            <div className="dashboard-hero" style={{ opacity: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-navy)", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
                  Ringkasan Penilaian
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <RiskBadge score={userData.creditScore} />
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                    Sesi terbaru · 23 Apr 2026
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Link
                  href={`/dashboard/${DEMO_SESSION}`}
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
                  Skor kredit Anda berdasarkan data wawancara terakhir
                </p>
              </div>
              <CreditGauge score={userData.creditScore} maxScore={850} />
            </section>

            {/* Metrics grid */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
                Rincian Cepat
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
                {userData.metrics.map(m => (
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
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
                Rekomendasi Pinjaman
              </h2>
              <LoanBanner amount={userData.loanAmount} isEligible={userData.isEligible} />
            </section>

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
                  Lihat breakdown lengkap 5 dimensi, narasi AI, dan histori sesi.
                </div>
              </div>
              <Link
                href={`/dashboard/${DEMO_SESSION}`}
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
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
