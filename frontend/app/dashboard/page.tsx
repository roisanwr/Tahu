"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CreditGauge } from "../../components/dashboard/CreditGauge";
import { SubScoreCard } from "../../components/dashboard/SubScoreCard";
import { LoanBanner } from "../../components/dashboard/LoanBanner";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { TrendingUp, MapPin, FileCheck, ShieldCheck } from "lucide-react";

gsap.registerPlugin(useGSAP);

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock Data (Usually comes from context / state after Chat completes)
  const userData = {
    creditScore: 820,
    metrics: [
      { id: 1, title: "Kekuatan Cashflow", value: "Tinggi", status: "good" as const, icon: TrendingUp },
      { id: 2, title: "Risiko Lokasi", value: "Rendah", status: "good" as const, icon: MapPin },
      { id: 3, title: "Kelengkapan Dokumen", value: "Lengkap", status: "info" as const, icon: FileCheck },
      { id: 4, title: "Keamanan Usaha", value: "Terverifikasi", status: "good" as const, icon: ShieldCheck }
    ],
    loanAmount: "Rp 50.000.000",
    isEligible: true
  };

  useGSAP(() => {
    const tl = gsap.timeline();

    // 1. Hero Gauge appears
    tl.to(".dashboard-hero", {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "back.out(1.2)"
    });

    // 2. Metrics Stagger
    tl.to(".dashboard-metric", {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: "power2.out"
    }, "-=0.2");

    // 3. CTA Banner appears
    tl.to(".dashboard-cta", {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "back.out(1.1)"
    }, "-=0.1");

  }, { scope: containerRef });

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", backgroundColor: "var(--color-bg)", fontFamily: "sans-serif", overflowY: "auto", flexDirection: "column" }}>
      
      {/* Header - Full Width */}
      <DashboardHeader />

      <main style={{ display: "flex", flex: 1, justifyContent: "center", width: "100%" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 950, width: "100%", backgroundColor: "var(--color-bg)", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)", minHeight: "100%" }}>
          
          <div ref={containerRef} style={{ padding: "24px 20px 48px", display: "flex", flexDirection: "column", gap: 32 }}>
          
          {/* Main Visualization */}
          <section>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-navy)", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Hasil Penilaian Usaha</h1>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>Analisa mendalam berdasarkan data interaktif Anda.</p>
            </div>
            
            <CreditGauge score={userData.creditScore} />
          </section>

          {/* Metrics Grid */}
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-navy)", margin: "0 0 16px" }}>Rincian Analisis</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
              {userData.metrics.map((metric) => (
                <SubScoreCard 
                  key={metric.id}
                  title={metric.title}
                  value={metric.value}
                  status={metric.status}
                  icon={metric.icon}
                />
              ))}
            </div>
          </section>

          {/* Call to Action */}
          <section style={{ marginTop: 8 }}>
            <LoanBanner amount={userData.loanAmount} isEligible={userData.isEligible} />
          </section>

          </div>
        </div>
      </main>
    </div>
  );
}
