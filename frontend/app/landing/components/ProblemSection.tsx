"use client";

import { useEffect, useRef } from "react";
import { content } from "../content";

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      gsap.fromTo(leftRef.current,
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true } }
      );

      gsap.fromTo(rightRef.current,
        { x: 50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true } }
      );
    };
    init();
  }, []);

  const { problem } = content;

  return (
    <section ref={sectionRef} style={{ padding: "var(--space-24) 0", overflow: "hidden" }}>
      <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "var(--space-16)", alignItems: "center" }}>
        
        {/* LEFT — Copy */}
        <div ref={leftRef}>
          <div className="section-label">{problem.label}</div>
          <h2 className="section-title" style={{ whiteSpace: "pre-line" }}>{problem.title}</h2>
          <p className="section-subtitle">{problem.subtitle}</p>
        </div>

        {/* RIGHT — Before/After Visual */}
        <div ref={rightRef} style={{ display: "flex", gap: "var(--space-4)", position: "relative" }}>
          {/* Subtle background blob */}
          <div aria-hidden style={{ position: "absolute", inset: "-10%", background: "var(--color-warn-gray)", borderRadius: "var(--radius-xl)", zIndex: -1 }} />

          {/* Before */}
          <div style={{ flex: 1, background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-4)" }}>
              {problem.before.label}
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {problem.before.items.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ color: "#E11D48", flexShrink: 0 }}>×</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div style={{ flex: 1, background: "var(--color-accent-light)", border: "1px solid var(--color-accent)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", boxShadow: "var(--shadow-md)" }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-accent-dark)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-4)" }}>
              {problem.after.label}
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {problem.after.items.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-accent-dark)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--color-accent)", flexShrink: 0 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <style>{`
        @media (max-width: 900px) {
          .container { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .container > div:last-child { flexDirection: column !important; }
        }
      `}</style>
    </section>
  );
}
