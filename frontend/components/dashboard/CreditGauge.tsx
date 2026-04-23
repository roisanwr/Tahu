"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface CreditGaugeProps {
  score: number;
  maxScore?: number;
}

export function CreditGauge({ score, maxScore = 1000 }: CreditGaugeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [displayScore, setDisplayScore] = useState(0);

  // Styling logic based on score
  const getScoreColor = () => {
    if (score >= 800) return "#10B981"; // Emerald
    if (score >= 600) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  const getScoreLabel = () => {
    if (score >= 800) return "Sangat Baik ✨";
    if (score >= 600) return "Cukup Baik 👍";
    return "Butuh Perbaikan ⚠️";
  };

  useEffect(() => {
    if (!pathRef.current) return;

    // We animate from 0 to the target ratio
    const currentRatio = Math.max(0, Math.min(score / maxScore, 1));
    
    // Half circle length = Pi * r. At r=90, length is ~282.74
    // However, for an SVG arc 'A 90 90 0 0 1 190 100' ... length can be read from getTotalLength()
    const pathLength = pathRef.current.getTotalLength();
    
    // Initialize
    gsap.set(pathRef.current, {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength
    });

    // Animate
    gsap.to(pathRef.current, {
      strokeDashoffset: pathLength - (pathLength * currentRatio),
      duration: 1.5,
      ease: "power3.out",
      delay: 0.2
    });

    // Count up animation for text
    const counterObj = { val: 0 };
    gsap.to(counterObj, {
      val: score,
      duration: 1.5,
      ease: "power3.out",
      delay: 0.2,
      onUpdate: () => {
        setDisplayScore(Math.floor(counterObj.val));
      }
    });

  }, [score, maxScore]);

  return (
    <div ref={containerRef} className="dashboard-hero" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", padding: "32px 0 16px", opacity: 0, transform: "translateY(20px)" }}>
      <div style={{ position: "relative", width: 200, height: 110, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
        
        {/* SVG Definition */}
        <svg 
          viewBox="0 0 200 110" 
          width="100%" 
          height="100%" 
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
        >
          {/* Background Track */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Active Track */}
          <path
            ref={pathRef}
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke={getScoreColor()}
            strokeWidth="16"
            strokeLinecap="round"
          />
        </svg>

        {/* Inner Text Absolute positioned */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(16px)" }}>
          <span style={{ fontSize: 48, fontWeight: 800, color: "var(--color-navy)", lineHeight: 1, letterSpacing: "-1px" }}>
            {displayScore}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginTop: 4 }}>
            Skor Kredit 
          </span>
        </div>
      </div>

      <div style={{ padding: "8px 16px", background: "var(--color-bg)", borderRadius: 20, border: "1px solid var(--color-border)", marginTop: 24, fontSize: 14, fontWeight: 700, color: getScoreColor() }}>
        {getScoreLabel()}
      </div>
    </div>
  );
}
