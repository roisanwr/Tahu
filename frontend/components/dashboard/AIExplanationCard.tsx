"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Sparkles } from "lucide-react";

interface AIExplanationCardProps {
  score: number;
  riskLabel: string;
  explanation: string;
}

export function AIExplanationCard({ score, riskLabel, explanation }: AIExplanationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!cardRef.current) return;

    // Card slides in
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay: 0.4, ease: "power3.out" }
    );

    // Typewriter effect starts after card appears
    const delay = setTimeout(() => {
      setIsTyping(true);
      let i = 0;
      const interval = setInterval(() => {
        if (i < explanation.length) {
          setDisplayedText(explanation.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 18); // 18ms per char — feels natural, not too slow
      return () => clearInterval(interval);
    }, 700);

    return () => clearTimeout(delay);
  }, [explanation]);

  // Auto-scroll textRef parent as typewriter runs
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [displayedText]);

  return (
    <div
      ref={cardRef}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 20,
        overflow: "hidden",
        opacity: 0,
        transform: "translateY(20px)",
      }}
    >
      {/* Header strip */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-accent-light)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Sparkles size={16} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-accent)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Analisis AI — TAHU
          </div>
          <div style={{ fontSize: 10, color: "var(--color-accent-dark)", fontWeight: 500, marginTop: 1 }}>
            Berdasarkan data wawancara & dokumen
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px" }}>
        <p
          ref={textRef}
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: "var(--color-text-primary)",
            margin: 0,
            minHeight: 80,
          }}
        >
          {displayedText}
          {isTyping && (
            <span style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              background: "var(--color-accent)",
              marginLeft: 2,
              verticalAlign: "text-bottom",
              animation: "cursor-blink 0.9s step-end infinite",
            }} />
          )}
        </p>
      </div>

      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
