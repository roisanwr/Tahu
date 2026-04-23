"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, X, Home, ChevronRight, BarChart2, Clock, LogIn, LogOut, PlusCircle, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

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
  const { user, isLoggedIn, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    onClose();
    router.push("/");
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 99,
            backdropFilter: "blur(1px)",
          }}
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
        {/* ── HEADER USER ──────────────────────────────────────────── */}
        <div style={{
          padding: "20px 16px 16px",
          display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
          background: isLoggedIn ? "var(--color-accent-light)" : "var(--color-bg)",
        }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            overflow: "hidden", flexShrink: 0,
            border: `2px solid ${isLoggedIn ? "var(--color-accent)" : "var(--color-border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isLoggedIn ? "transparent" : "var(--color-surface)",
          }}>
            {isLoggedIn && user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User size={20} color="var(--color-text-muted)" strokeWidth={2} />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {isLoggedIn ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-accent)", marginTop: 1, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.email}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Tamu</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>Belum login</div>
              </>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: "none",
              background: "var(--color-bg)", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--color-text-primary)", flexShrink: 0,
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* GUEST: login CTA */}
          {!isLoggedIn && (
            <div style={{ padding: "16px 16px 8px" }}>
              <div style={{
                background: "var(--color-accent-light)",
                border: "1px solid var(--color-border)",
                borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-navy)", marginBottom: 4 }}>
                  Login untuk simpan progres
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Riwayat penilaian, skor, dan rekomendasi pinjaman tersimpan otomatis.
                </div>
                <button
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "10px", background: "var(--color-accent)", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", transition: "background 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
                  onClick={() => { onClose(); }}
                >
                  <LogIn size={15} strokeWidth={2.5} />
                  Masuk dengan Google
                </button>
              </div>
            </div>
          )}

          {/* LOGGED IN: bisnis list */}
          {isLoggedIn && (
            <>
              <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={12} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>
                    Bisnis Saya
                  </span>
                </div>
                <Link
                  href="/chat"
                  onClick={onClose}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 700, color: "var(--color-accent)",
                    textDecoration: "none", transition: "opacity 0.2s",
                  }}
                >
                  <PlusCircle size={12} strokeWidth={2.5} />
                  Tambah Usaha
                </Link>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
                {MOCK_SESSIONS.map(s => (
                  <Link
                    key={s.id}
                    href={`/dashboard/${s.id}`}
                    onClick={onClose}
                    style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 5, padding: "11px 12px", borderRadius: 10, border: "1px solid transparent", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--color-bg)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-navy)", lineHeight: 1.35 }}>{s.name}</span>
                      <ChevronRight size={12} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <BarChart2 size={11} color={s.scoreColor} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.scoreColor, fontVariantNumeric: "tabular-nums" }}>{s.score}</span>
                      <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>{s.scoreLabel}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-text-muted)" }}>{s.date}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* GUEST: info tagline */}
          {!isLoggedIn && (
            <div style={{ padding: "0 16px", flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.55, margin: 0 }}>
                Kamu tetap bisa mulai wawancara tanpa login. Data akan tersimpan saat login di akhir penilaian.
              </p>
            </div>
          )}
        </div>

        {/* ── FOOTER NAV ───────────────────────────────────────────── */}
        <div style={{ padding: "8px 12px 24px", borderTop: "1px solid var(--color-border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {isLoggedIn && (
            <Link
              href="/dashboard"
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: "var(--color-text-primary)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <LayoutDashboard size={16} strokeWidth={1.8} />
              Dashboard
            </Link>
          )}

          <Link
            href="/"
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: "var(--color-text-primary)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Home size={16} strokeWidth={1.8} />
            Beranda
          </Link>

          {isLoggedIn && (
            <button
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8,
                color: "#EF4444", background: "transparent", border: "none",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                textAlign: "left", width: "100%", transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <LogOut size={16} strokeWidth={1.8} />
              Keluar
            </button>
          )}

          <div style={{ fontSize: 10, color: "var(--color-text-muted)", textAlign: "center", marginTop: 8, opacity: 0.6 }}>
            TAHU v0.1 · Data simulasi
          </div>
        </div>
      </div>
    </>
  );
}
