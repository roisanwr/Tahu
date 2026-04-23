"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { content } from "../content";

export default function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      gsap.fromTo(boxRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { 
          opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true }
        }
      );
    };
    init();
  }, []);

  const { cta } = content;

  return (
    <section ref={sectionRef} style={{ padding: "var(--space-24) 0", background: "var(--color-surface)" }}>
      <div className="container">
        <div ref={boxRef} style={{ position: "relative", background: "linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-light) 100%)", borderRadius: "var(--radius-xl)", padding: "var(--space-20) var(--space-6)", textAlign: "center", overflow: "hidden", color: "#fff" }}>
          <div aria-hidden style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: "radial-gradient(circle at 30% 40%, rgba(46,167,122,0.15) 0%, transparent 50%)", pointerEvents: "none" }} />
          
          <h2 style={{ position: "relative", color: "#ffffff", fontFamily: "var(--font-serif)", fontSize: "var(--text-4xl)", fontWeight: 700, marginBottom: "var(--space-4)", whiteSpace: "pre-line" }}>
            {cta.title}
          </h2>
          <p style={{ position: "relative", fontSize: "var(--text-lg)", color: "rgba(255,255,255,0.8)", maxWidth: 500, margin: "0 auto var(--space-10)", lineHeight: 1.6 }}>
            {cta.subtitle}
          </p>
          
          <div style={{ position: "relative" }}>
            <Link href={cta.ctaHref} style={{ display: "inline-flex", background: "#ffffff", color: "var(--color-navy)", fontSize: "var(--text-base)", fontWeight: 700, padding: "var(--space-4) var(--space-8)", borderRadius: "var(--radius-sm)", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", transition: "transform var(--dur-fast), box-shadow var(--dur-fast)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}>
              {cta.ctaLabel} →
            </Link>
            <div style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.4)", marginTop: "var(--space-4)" }}>
              {cta.note}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .cta-title h2 { font-size: var(--text-3xl) !important; }
        }
      `}</style>
    </section>
  );
}
