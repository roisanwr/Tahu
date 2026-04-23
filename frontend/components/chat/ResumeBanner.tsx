"use client";

import { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import { RotateCcw, X, ArrowRight } from "lucide-react";
import Link from "next/link";

interface LastSession {
  id: string;
  name: string;
  progress: number;
  lastActive: string;
}

export function ResumeBanner() {
  const [lastSession, setLastSession] = useState<LastSession | null>(null);
  const [visible, setVisible]         = useState(false);
  const [dismissed, setDismissed]     = useState(false);
  const bannerRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hanya tampil jika ada sesi tersimpan di localStorage
    try {
      const stored = localStorage.getItem("tahu_last_session");
      if (!stored) return; // User baru — jangan tampil sama sekali

      const parsed: LastSession = JSON.parse(stored);
      setLastSession(parsed);

      // Jangan tampil lagi kalau sudah di-dismiss di sesi ini
      const wasDismissed = sessionStorage.getItem("tahu_banner_dismissed");
      if (wasDismissed) return;

      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    } catch {
      // localStorage korup — abaikan
    }
  }, []);

  useEffect(() => {
    if (!visible || !bannerRef.current) return;
    gsap.fromTo(bannerRef.current,
      { opacity: 0, y: -20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.3)" }
    );
  }, [visible]);

  const handleDismiss = () => {
    if (!bannerRef.current) { setDismissed(true); return; }
    gsap.to(bannerRef.current, {
      opacity: 0, y: -16, scale: 0.97, duration: 0.3, ease: "power2.in",
      onComplete: () => {
        setDismissed(true);
        sessionStorage.setItem("tahu_banner_dismissed", "1");
      },
    });
  };

  if (!visible || dismissed || !lastSession) return null;

  return (
    <div
      ref={bannerRef}
      style={{
        margin: "0 16px 12px",
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-accent)",
        borderRadius: 14,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(13,107,79,0.10)",
        opacity: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent left bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--color-accent)", borderRadius: "14px 0 0 14px" }} />

      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-accent-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <RotateCcw size={16} color="var(--color-accent)" strokeWidth={2.5} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Lanjutkan penilaian terakhir?
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {lastSession.name} · {lastSession.lastActive}
        </div>
        <div style={{ marginTop: 6, height: 3, background: "var(--color-bg)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${lastSession.progress}%`, background: "var(--color-accent)", borderRadius: 99 }} />
        </div>
      </div>

      <Link
        href={`/dashboard/${lastSession.id}`}
        onClick={handleDismiss}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "7px 13px", background: "var(--color-accent)", color: "#fff",
          borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none",
          flexShrink: 0, transition: "background 0.2s", whiteSpace: "nowrap",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"}
        onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
      >
        Lihat Hasil
        <ArrowRight size={12} strokeWidth={2.5} />
      </Link>

      <button
        onClick={handleDismiss}
        style={{ width: 24, height: 24, border: "none", background: "var(--color-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-muted)", flexShrink: 0 }}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
