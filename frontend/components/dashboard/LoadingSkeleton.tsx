"use client";

import React from "react";

export function DashboardSkeleton() {
  const pulseStyle = {
    animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    background: "var(--color-border)",
    borderRadius: 8,
  };

  return (
    <div style={{ width: "100%", padding: "24px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
      
      {/* Header Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ ...pulseStyle, width: 40, height: 16, marginBottom: 12 }}></div>
          <div style={{ ...pulseStyle, width: 200, height: 28, marginBottom: 8, borderRadius: 12 }}></div>
          <div style={{ ...pulseStyle, width: 150, height: 16 }}></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...pulseStyle, width: 100, height: 38, borderRadius: 10 }}></div>
          <div style={{ ...pulseStyle, width: 100, height: 38, borderRadius: 10 }}></div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
        {/* Gauge */}
        <div style={{ ...pulseStyle, minWidth: 200, height: 180, borderRadius: "100px 100px 0 0" }}></div>
        
        {/* Metric Cards */}
        <div style={{ flex: 1, minWidth: 280, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ ...pulseStyle, height: 80, borderRadius: 16 }}></div>
          ))}
        </div>
      </div>

      {/* Radar Chart Section */}
      <div style={{ ...pulseStyle, width: "100%", height: 300, borderRadius: 20, marginBottom: 32 }}></div>
    </div>
  );
}
