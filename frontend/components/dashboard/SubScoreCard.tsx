"use client";

import { LucideIcon } from "lucide-react";

interface SubScoreCardProps {
  title: string;
  value: string;
  score?: number; // 0–100
  weight?: string;
  status: "good" | "warning" | "warn" | "bad" | "info";
  icon: LucideIcon;
  delay?: number;
}

export function SubScoreCard({ title, value, score, weight, status, icon: Icon, delay = 0 }: SubScoreCardProps) {
  const getStatusStyle = () => {
    switch (status) {
      case "good": return { bg: "#E8F5EF", color: "#10B981" };
      case "warning":
      case "warn": return { bg: "#FEF3C7", color: "#F59E0B" };
      case "bad": return { bg: "#FEE2E2", color: "#EF4444" };
      case "info": return { bg: "#EFF6FF", color: "#3B82F6" };
      default: return { bg: "var(--color-bg)", color: "var(--color-navy)" };
    }
  };

  const style = getStatusStyle();

  return (
    <div className="dashboard-metric" style={{ 
      background: "var(--color-surface)", 
      border: "1px solid var(--color-border)", 
      borderRadius: 16, 
      padding: 16, 
      display: "flex", 
      alignItems: "flex-start", 
      gap: 12,
      opacity: 0, // for GSAP stagger
      transform: "translateY(15px)"
    }}>
      <div style={{ 
        width: 40, height: 40, borderRadius: 10, background: style.bg, color: style.color, 
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 
      }}>
        <Icon size={20} strokeWidth={2.5} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", lineHeight: 1.2 }}>{title}</span>
          {weight && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-muted)", padding: "1px 5px", background: "var(--color-bg)", borderRadius: 4, border: "1px solid var(--color-border)" }}>Bobot: {weight}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-navy)", lineHeight: 1.2 }}>
            {value}
          </span>
          {score !== undefined && (
            <span style={{ fontSize: 13, fontWeight: 700, color: style.color, fontVariantNumeric: "tabular-nums" }}>
              {score}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-muted)" }}>/100</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
