"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface SubScore {
  label: string;
  score: number;
  weight: string;
  icon: string;
  color: string;
  trackColor: string;
}

interface ScoreBreakdownBarProps {
  subScores: SubScore[];
}

export function ScoreBreakdownBar({ subScores }: ScoreBreakdownBarProps) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barsRef.current) return;
    const bars = barsRef.current.querySelectorAll<HTMLDivElement>(".fill-bar");
    bars.forEach((bar, i) => {
      const target = parseFloat(bar.dataset.target || "0");
      gsap.fromTo(bar,
        { width: "0%" },
        {
          width: `${target}%`,
          duration: 1.2,
          delay: 0.1 + i * 0.12,
          ease: "power3.out",
        }
      );
    });
  }, [subScores]);

  return (
    <div ref={barsRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {subScores.map((item) => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {/* Label row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-navy)" }}>{item.label}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-text-muted)",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                padding: "1px 7px",
                borderRadius: 99,
                letterSpacing: "0.05em",
              }}>
                bobot {item.weight}
              </span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: item.color, fontVariantNumeric: "tabular-nums" }}>
              {item.score}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginLeft: 1 }}>/100</span>
            </span>
          </div>

          {/* Track */}
          <div style={{
            height: 7,
            background: item.trackColor,
            borderRadius: 99,
            overflow: "hidden",
          }}>
            <div
              className="fill-bar"
              data-target={item.score.toString()}
              style={{
                height: "100%",
                background: item.color,
                borderRadius: 99,
                width: "0%", // GSAP animates this
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
