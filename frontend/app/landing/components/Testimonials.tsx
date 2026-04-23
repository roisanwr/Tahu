"use client";

import { useEffect, useRef } from "react";
import { content } from "../content";

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 30 },
        { 
          opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true }
        }
      );
    };
    init();
  }, []);

  const { testimonials } = content;

  return (
    <section id="testimoni" ref={sectionRef} style={{ padding: "var(--space-24) 0", background: "var(--color-bg)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "var(--space-16)" }}>
          <div className="section-label">{testimonials.label}</div>
          <h2 className="section-title" style={{ whiteSpace: "pre-line" }}>{testimonials.title}</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-6)" }}>
          {testimonials.items.map((item, i) => (
            <div key={i} ref={(el) => { cardsRef.current[i] = el; }} style={{ background: "var(--color-surface)", padding: "var(--space-8)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-light)", display: "flex", flexDirection: "column", gap: "var(--space-6)", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ color: "#F59E0B", fontSize: "var(--text-lg)", letterSpacing: "2px" }}>★★★★★</div>
              <blockquote style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.8, fontStyle: "italic", flex: 1 }}>
                "{item.quote}"
              </blockquote>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-accent-light)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "var(--text-sm)" }}>
                  {item.initials}
                </div>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>{item.name}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{item.role} · {item.city}</div>
                </div>
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
