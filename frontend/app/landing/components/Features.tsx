"use client";

import { useEffect, useRef } from "react";
import { content } from "../content";

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 30 },
        { 
          opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true }
        }
      );

      gsap.fromTo(highlightRef.current,
        { opacity: 0, scale: 0.95 },
        { 
          opacity: 1, scale: 1, duration: 0.8, ease: "power3.out", delay: 0.2,
          scrollTrigger: { trigger: highlightRef.current, start: "top 85%", once: true }
        }
      );
    };
    init();
  }, []);

  const { features } = content;

  return (
    <section id="keunggulan" ref={sectionRef} style={{ padding: "var(--space-24) 0", background: "var(--color-surface)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "var(--space-16)" }}>
          <div className="section-label">{features.label}</div>
          <h2 className="section-title" style={{ whiteSpace: "pre-line" }}>{features.title}</h2>
          <p className="section-subtitle" style={{ margin: "0 auto" }}>{features.subtitle}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-6)" }}>
          {features.cards.map((card, i) => (
            <div key={i} ref={(el) => { cardsRef.current[i] = el; }} style={{ background: "var(--color-bg)", padding: "var(--space-8)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-light)", transition: "box-shadow var(--dur-fast)" }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = "var(--shadow-md)"} onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--space-4)" }}>{card.icon}</div>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-navy)", marginBottom: "var(--space-2)" }}>{card.title}</h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{card.description}</p>
            </div>
          ))}

          <div ref={highlightRef} style={{ gridColumn: "1 / -1", background: "var(--color-navy)", borderRadius: "var(--radius-xl)", padding: "var(--space-12)", display: "flex", gap: "var(--space-12)", alignItems: "center", color: "#fff", marginTop: "var(--space-6)", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: "radial-gradient(ellipse at center right, rgba(46,167,122,0.1) 0%, transparent 70%)" }} />
            <div style={{ flex: 1, zIndex: 1 }}>
              <h3 style={{ color: "#ffffff", fontFamily: "var(--font-serif)", fontSize: "var(--text-3xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>{features.highlight.title}</h3>
              <p style={{ fontSize: "var(--text-base)", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>{features.highlight.description}</p>
            </div>
            
            <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", border: "1px solid rgba(255,255,255,0.1)", zIndex: 1 }}>
              <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-display)", fontWeight: 700, color: "#4ADE80", lineHeight: 1 }}>{features.highlight.scoreValue}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.5)", marginTop: "var(--space-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{features.highlight.scoreLabel}</div>
              </div>
              <div>
                {features.highlight.dimensions.map(dim => (
                  <div key={dim.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", color: "rgba(255,255,255,0.8)", marginBottom: "var(--space-2)", paddingBottom: "var(--space-2)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <span>{dim.name}</span>
                    <span style={{ fontWeight: 600, color: "var(--color-accent-light)" }}>Bobot {dim.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .container > div:last-child { grid-template-columns: 1fr !important; }
          .container > div:last-child > div:last-child { flex-direction: column !important; }
        }
      `}</style>
    </section>
  );
}
