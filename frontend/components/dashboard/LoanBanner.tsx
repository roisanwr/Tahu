"use client";

import { Wallet, ArrowRight } from "lucide-react";

interface LoanBannerProps {
  amount: string;
  isEligible: boolean;
}

export function LoanBanner({ amount, isEligible }: LoanBannerProps) {
  if (!isEligible) {
    return (
      <div className="dashboard-cta" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, padding: 24, textAlign: "center", opacity: 0, transform: "translateY(20px)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-navy)", margin: "0 0 8px" }}>Belum Memenuhi Syarat Pencairan KUR</h3>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>Silakan tingkatkan riwayat transaksi Anda selama 3 bulan ke depan untuk membuka akses pinjaman prioritas UMKM TAHU.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-cta" style={{ background: "linear-gradient(145deg, #059669, #10B981)", borderRadius: 24, padding: "28px 24px", color: "#fff", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 24px rgba(16, 185, 129, 0.2)", position: "relative", overflow: "hidden", opacity: 0, transform: "translateY(20px)" }}>
      {/* Decorative background shape */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 150, height: 150, background: "rgba(255,255,255,0.1)", borderRadius: "50%" }}></div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
        <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <Wallet size={24} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "0.2px" }}>Rekomendasi KUR Terbuka</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{amount}</div>
        </div>
      </div>

      <button style={{ position: "relative", zIndex: 1, width: "100%", padding: "14px", background: "#ffffff", color: "#059669", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
        Ajukan Pencairan Sekarang
        <ArrowRight size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
