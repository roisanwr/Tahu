"use client";

interface RiskBadgeProps {
  score: number;
}

type RiskLevel = {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
};

function getRiskLevel(score: number): RiskLevel {
  if (score >= 750) return {
    label: "Risiko Sangat Rendah",
    shortLabel: "Very Low Risk",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#6EE7B7",
    dot: "#10B981",
  };
  if (score >= 650) return {
    label: "Risiko Rendah",
    shortLabel: "Low Risk",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#93C5FD",
    dot: "#3B82F6",
  };
  if (score >= 550) return {
    label: "Risiko Sedang",
    shortLabel: "Medium Risk",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FCD34D",
    dot: "#F59E0B",
  };
  if (score >= 450) return {
    label: "Risiko Tinggi",
    shortLabel: "High Risk",
    color: "#C2410C",
    bg: "#FFF7ED",
    border: "#FDBA74",
    dot: "#F97316",
  };
  return {
    label: "Risiko Sangat Tinggi",
    shortLabel: "Very High Risk",
    color: "#B91C1C",
    bg: "#FEF2F2",
    border: "#FCA5A5",
    dot: "#EF4444",
  };
}

export function RiskBadge({ score }: RiskBadgeProps) {
  const risk = getRiskLevel(score);

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 16px",
      background: risk.bg,
      border: `1.5px solid ${risk.border}`,
      borderRadius: 99,
    }}>
      {/* Pulsing dot */}
      <span style={{ position: "relative", display: "flex", width: 8, height: 8 }}>
        <span style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: risk.dot,
          opacity: 0.4,
          animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
        }} />
        <span style={{
          position: "relative",
          display: "block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: risk.dot,
        }} />
      </span>

      <span style={{ fontSize: 12, fontWeight: 700, color: risk.color, letterSpacing: "0.02em" }}>
        {risk.label}
      </span>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: risk.color,
        opacity: 0.6,
        fontFamily: "monospace",
        letterSpacing: "0.05em",
      }}>
        {risk.shortLabel}
      </span>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
