"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { content } from "../content";
import HeroChat from "./HeroChat";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef   = useRef<HTMLDivElement>(null);
  const h1Ref      = useRef<HTMLHeadingElement>(null);
  const subRef     = useRef<HTMLParagraphElement>(null);
  const ctaRef     = useRef<HTMLDivElement>(null);
  const floatRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import("gsap");
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(badgeRef.current,   { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.3)
        .fromTo(h1Ref.current,      { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.45)
        .fromTo(subRef.current,     { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.6)
        .fromTo(ctaRef.current,     { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.75)
        .fromTo(floatRef.current,   { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0 }, 0.5);
    };
    init();
  }, []);

  const { hero } = content;

  return (
    <section
      ref={sectionRef}
      style={{
        paddingTop: "calc(var(--space-20) + var(--space-16))",
        paddingBottom: "var(--space-24)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Warm background accent — bukan purple! */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "10%",
          right: "-5%",
          width: "45%",
          height: "70%",
          borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
          background: "radial-gradient(ellipse at center, rgba(232,245,239,0.8) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-16)",
          alignItems: "center",
        }}
      >
        {/* LEFT — Copy */}
        <div>
          {/* Badge */}
          <div
            ref={badgeRef}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              background: "var(--color-accent-light)",
              color: "var(--color-accent)",
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              borderRadius: "100px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: "var(--space-8)",
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--color-accent)",
              flexShrink: 0,
            }} />
            {hero.badge}
          </div>

          {/* Headline — intentionally large, Playfair Display */}
          <h1
            ref={h1Ref}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.8rem, 5vw, var(--text-display))",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              color: "var(--color-navy)",
              marginBottom: "var(--space-6)",
            }}
          >
            {hero.headlineLine1}
            <br />
            <span style={{ color: "var(--color-accent)" }}>{hero.headlineLine2}</span>
          </h1>

          {/* Sub-headline */}
          <p
            ref={subRef}
            style={{
              fontSize: "var(--text-lg)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.8,
              maxWidth: "520px",
              marginBottom: "var(--space-10)",
            }}
          >
            {hero.subheadline}
          </p>

          {/* CTA */}
          <div ref={ctaRef} style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <Link
              href={hero.ctaPrimaryHref}
              className="btn-primary"
              style={{ fontSize: "var(--text-base)", padding: "var(--space-4) var(--space-8)" }}
            >
              {hero.ctaPrimary} →
            </Link>
            <Link
              href={hero.ctaSecondaryHref}
              className="btn-secondary"
              style={{ fontSize: "var(--text-base)", padding: "var(--space-4) var(--space-8)" }}
            >
              {hero.ctaSecondary}
            </Link>
          </div>

          {/* Trust signals */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-6)",
            marginTop: "var(--space-10)",
            borderTop: "1px solid var(--color-border-light)",
            paddingTop: "var(--space-6)",
          }}>
            {[
              { val: "Gratis",     sub: "Tanpa biaya pendaftaran" },
              { val: "< 10 mnt",   sub: "Durasi wawancara" },
              { val: "300–850",    sub: "Rentang skor kredit" },
            ].map((t) => (
              <div key={t.val}>
                <div style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-xl)",
                  fontWeight: 700,
                  color: "var(--color-navy)",
                  lineHeight: 1.2,
                }}>{t.val}</div>
                <div style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  marginTop: "var(--space-1)",
                }}>{t.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Visual Mockup (intentionally asymmetric) */}
        <div
          ref={floatRef}
          style={{
            position: "relative",
            paddingLeft: "var(--space-8)",
          }}
        >
          <HeroChat />
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-visual { display: none !important; }
        }
      `}</style>
    </section>
  );
}
