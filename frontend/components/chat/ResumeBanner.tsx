"use client";

import { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
import { RotateCcw, X, ArrowRight } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "tahu_last_session";

// Mock last session data (in real app, pulled from localStorage/Supabase)
const LAST_SESSION = {
  id: "session-demo-001",
  name: "Warung Sembako Bu Sari",
  progress: 40, // percent
  lastActive: "23 Apr 2026, 14:22",
};

export function ResumeBanner() {
  const [visible, setVisible]     = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const bannerRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only show if not already dismissed this session
    const wasDismissed = sessionStorage.getItem("tahu_banner_dismissed");
    if (wasDismissed) return;

    // Simulate: show after 800ms delay (feels natural)
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible || !bannerRef.current) return;
    gsap.fromTo(bannerRef.current,
      { opacity: 0, y: -20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.3)" }
    );
  }, [visible]);

  const handleDismiss = () => {
    if (!bannerRef.current) {
      setDismissed(true);
      return;
    }
    gsap.to(bannerRef.current, {
      opacity: 0, y: -16, scale: 0.97,
      duration: 0.3, ease: "power2.in",
      onComplete: () => {
        setDismissed(true);
        sessionStorage.setItem("tahu_banner_dismissed", "1");
      },
    });
  };

  if (!visible || dismissed) return null;

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
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: "var(--color-accent)",
        borderRadius: "14px 0 0 14px",
      }} />

      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--color-accent-light)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <RotateCcw size={16} color="var(--color-accent)" strokeWidth={2.5} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Lanjutkan penilaian terakhir?
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {LAST_SESSION.name} · {LAST_SESSION.lastActive}
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 6, height: 3, background: "var(--color-bg)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${LAST_SESSION.progress}%`, background: "var(--color-accent)", borderRadius: 99 }} />
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/dashboard/${LAST_SESSION.id}`}
        onClick={handleDismiss}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "7px 13px",
          background: "var(--color-accent)", color: "#fff",
          borderRadius: 8, fontSize: 12, fontWeight: 700,
          textDecoration: "none", flexShrink: 0,
          transition: "background 0.2s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"}
        onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
      >
        Lanjutkan
        <ArrowRight size={12} strokeWidth={2.5} />
      </Link>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        style={{
          width: 24, height: 24, border: "none",
          background: "var(--color-bg)", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--color-text-muted)",
          flexShrink: 0, transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--color-navy)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-muted)"}
        title="Tutup"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}
