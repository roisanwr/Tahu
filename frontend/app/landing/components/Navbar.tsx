"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { content } from "../content";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });

    // GSAP mount animation
    const initGsap = async () => {
      const { gsap } = await import("gsap");
      gsap.fromTo(
        navRef.current,
        { y: -80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.1 }
      );
    };
    initGsap();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: scrolled ? "var(--space-3) 0" : "var(--space-5) 0",
          background: scrolled
            ? "rgba(250,250,248,0.92)"
            : "rgba(250,250,248,0)",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: `1px solid ${scrolled ? "var(--color-border)" : "transparent"}`,
          transition:
            "padding 350ms var(--ease-out), background 350ms var(--ease-out), border-color 350ms var(--ease-out), backdrop-filter 350ms var(--ease-out)",
        }}
      >
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "var(--color-navy)",
              letterSpacing: "-0.025em",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--color-accent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 800,
                fontStyle: "italic",
                flexShrink: 0,
              }}
            >
              T
            </span>
            {content.navbar.brand}
          </Link>

          {/* Desktop Links */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}
            className="desktop-nav"
          >
            {content.navbar.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.01em",
                  transition: "color var(--dur-fast) var(--ease-out)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
              >
                {link.label}
              </Link>
            ))}
            <Link href={content.navbar.ctaHref} className="btn-primary">
              {content.navbar.cta} →
            </Link>
          </div>

          {/* Hamburger Mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            className="hamburger-btn"
            style={{
              border: "none",
              background: "transparent",
              padding: "var(--space-2)",
              color: "var(--color-text-primary)",
              display: "none",
            }}
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            background: "var(--color-surface)",
            display: "flex",
            flexDirection: "column",
            padding: "var(--space-20) var(--space-6) var(--space-8)",
            gap: "var(--space-6)",
          }}
        >
          {content.navbar.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--color-navy)",
                letterSpacing: "-0.01em",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={content.navbar.ctaHref}
            className="btn-primary"
            onClick={() => setMenuOpen(false)}
            style={{ marginTop: "var(--space-4)", justifyContent: "center", fontSize: "var(--text-base)" }}
          >
            {content.navbar.cta} →
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
