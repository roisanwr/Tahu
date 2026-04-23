"use client";

import { useEffect, useRef } from "react";
import { content } from "../content";

export default function StatsBar() {
  const sectionRef = useRef<HTMLElement>(null);
  const numbersRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      // Counter animation
      content.stats.forEach((stat, i) => {
        const el = numbersRef.current[i];
        if (!el) return;

        const obj = { val: 0 };
        gsap.to(obj, {
          val: stat.value,
          duration: 1.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            once: true,
          },
          onUpdate: () => {
            el.textContent =
              stat.prefix +
              (stat.value >= 1000
                ? obj.val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                : obj.val.toFixed(0)) +
              stat.suffix;
          },
        });
      });

      // Fade in section
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
        }
      );
    };
    init();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "var(--space-12) 0",
        borderTop: "1px solid var(--color-border-light)",
        borderBottom: "1px solid var(--color-border-light)",
        background: "var(--color-surface)",
      }}
    >
      <div className="container">
        <p style={{
          textAlign: "center",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-8)",
        }}>
          Dipercaya pelaku usaha di seluruh Indonesia
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--space-8)",
        }}>
          {content.stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                textAlign: "center",
                padding: "var(--space-4) 0",
                borderRight: i < 3 ? "1px solid var(--color-border-light)" : "none",
              }}
            >
              <div style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-4xl)",
                fontWeight: 700,
                color: "var(--color-navy)",
                lineHeight: 1.1,
              }}>
                <span
                  ref={(el) => { numbersRef.current[i] = el; }}
                >
                  {stat.prefix}0{stat.suffix}
                </span>
              </div>
              <div style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
                marginTop: "var(--space-2)",
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
