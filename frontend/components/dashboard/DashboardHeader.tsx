import { Menu } from "lucide-react";
import { skorinajaLogo } from "../icons/skorinajaLogo";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";

interface DashboardHeaderProps {
  onOpenDrawer?: () => void;
}

export function DashboardHeader({ onOpenDrawer }: DashboardHeaderProps) {
  const { isLoggedIn } = useAuth();

  return (
    <header style={{ padding: "0 24px", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
      {/* Left Area */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
        <button
          onClick={onOpenDrawer}
          style={{ width: 36, height: 36, border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)", transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <skorinajaLogo size={28} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, userSelect: "none" }}>
            <span style={{ color: "var(--color-accent)", fontWeight: 800, fontSize: 15, letterSpacing: "-0.5px" }}>skorinaja</span>
            <span style={{ color: "var(--color-navy)", fontSize: 9, fontWeight: 700 }}>NILAI KREDIT AI</span>
          </div>
        </Link>
      </div>

      {/* Center Area */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-navy)", letterSpacing: "0.2px" }}>Dashboard</span>
      </div>

      {/* Right Area */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: 1 }}>
        {isLoggedIn ? (
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)", background: "var(--color-accent-light)", padding: "4px 10px", borderRadius: 99 }}>Data Tersimpan</div>
        ) : (
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", background: "var(--color-bg)", border: "1px solid var(--color-border)", padding: "4px 10px", borderRadius: 99 }}>Guest Mode</div>
        )}
      </div>
    </header>
  );
}
