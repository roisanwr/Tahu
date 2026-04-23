import Link from "next/link";
import { User, X, Home, ChevronRight, BarChart2, Clock } from "lucide-react";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_SESSIONS = [
  {
    id: "session-demo-001",
    name: "Warung Sembako Bu Sari",
    score: 712,
    scoreLabel: "Risiko Rendah",
    scoreColor: "#2563EB",
    date: "23 Apr 2026",
  },
  {
    id: "session-demo-002",
    name: "Toko Online Budi Jaya",
    score: 641,
    scoreLabel: "Risiko Rendah",
    scoreColor: "#2563EB",
    date: "22 Apr 2026",
  },
  {
    id: "session-demo-003",
    name: "Jasa Ojek Pak Andi",
    score: 498,
    scoreLabel: "Risiko Tinggi",
    scoreColor: "#C2410C",
    date: "20 Apr 2026",
  },
];

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 99, backdropFilter: "blur(1px)" }}
        />
      )}

      {/* Side Drawer */}
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: 300,
          background: "var(--color-surface)", zIndex: 100,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex", flexDirection: "column",
          boxShadow: isOpen ? "var(--shadow-xl)" : "none",
          overflow: "hidden",
        }}
      >
        {/* User header */}
        <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-accent-light)", border: "2px solid var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent)" }}>
            <User size={20} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Guest User</div>
            <div style={{ fontSize: 11, color: "var(--color-accent-alt)", marginTop: 2, fontWeight: 600 }}>Belum Login</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, border: "none", background: "var(--color-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-primary)" }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 12px 8px", flexShrink: 0 }}>
          <Link
            href="/"
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, color: "var(--color-text-primary)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Home size={17} strokeWidth={1.8} />
            Kembali ke Beranda
          </Link>
        </nav>

        {/* Session history */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 20px 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} color="var(--color-text-muted)" />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
              Riwayat Sesi
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
            {MOCK_SESSIONS.map(s => (
              <Link
                key={s.id}
                href={`/dashboard/${s.id}`}
                onClick={onClose}
                style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 12, border: "1px solid transparent", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--color-bg)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-navy)", lineHeight: 1.35 }}>{s.name}</span>
                  <ChevronRight size={13} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <BarChart2 size={12} color={s.scoreColor} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: s.scoreColor, fontVariantNumeric: "tabular-nums" }}>
                      {s.score}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>{s.scoreLabel}</span>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-text-muted)" }}>{s.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px 24px", borderTop: "1px solid var(--color-border)", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.5 }}>
            TAHU — Smart Credit Interview v0.1<br />
            <span style={{ opacity: 0.6 }}>Data masih simulasi · Backend segera hadir</span>
          </div>
        </div>
      </div>
    </>
  );
}
