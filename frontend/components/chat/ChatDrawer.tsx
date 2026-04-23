import Link from "next/link";
import { User, X, Home } from "lucide-react";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  return (
    <>
      {/* DRAWER OVERLAY */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99, opacity: 1, transition: "opacity 0.3s" }}
        />
      )}

      {/* SIDE DRAWER */}
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: 300, background: "var(--color-surface)",
          zIndex: 100, transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex", flexDirection: "column", boxShadow: isOpen ? "var(--shadow-xl)" : "none"
        }}
      >
        <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-bg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)" }}>
            <User size={22} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Guest User</div>
            <div style={{ fontSize: 11, color: "var(--color-accent-alt)", marginTop: 2 }}>Belum Login</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, border: "none", background: "var(--color-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-primary)" }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <nav style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ marginBottom: 16 }}>
            <Link href="/" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, color: "var(--color-text-primary)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Home size={18} strokeWidth={1.8} />
              Kembali ke Beranda
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
