"use client";

import { useEffect, useRef } from "react";
import { content } from "../content";

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      gsap.fromTo(stepsRef.current,
        { y: 40, opacity: 0 },
        { 
          y: 0, opacity: 1, duration: 0.6, stagger: 0.2, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true }
        }
      );
    };
    init();
  }, []);

  const { howItWorks } = content;

  return (
    <section id="cara-kerja" ref={sectionRef} style={{ padding: "var(--space-24) 0", backgroundColor: "var(--color-bg)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "var(--space-16)" }}>
          <div className="section-label">{howItWorks.label}</div>
          <h2 className="section-title" style={{ whiteSpace: "pre-line" }}>{howItWorks.title}</h2>
          <p className="section-subtitle" style={{ margin: "0 auto" }}>{howItWorks.subtitle}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-8)", position: "relative" }}>
          {howItWorks.steps.map((step, i) => (
            <div key={step.number} ref={(el) => { stepsRef.current[i] = el; }} style={{ background: "var(--color-surface)", padding: "var(--space-8)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-light)", position: "relative", zIndex: 1, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "3rem", fontWeight: 700, color: "var(--color-accent-light)", lineHeight: 1, marginBottom: "var(--space-4)" }}>
                {step.number}
              </div>
              <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--color-navy)", marginBottom: "var(--space-3)" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
                {step.description}
              </p>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)", fontWeight: 600 }}>
                {step.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .container > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
