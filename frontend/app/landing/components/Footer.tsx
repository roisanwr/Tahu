"use client";

import Link from "next/link";
import { content } from "../content";

export default function Footer() {
  const { footer } = content;

  return (
    <footer style={{ paddingTop: "var(--space-16)", paddingBottom: "var(--space-8)", borderTop: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "var(--space-12)", marginBottom: "var(--space-12)" }} className="footer-grid">
          
          {/* Brand */}
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.375rem", fontWeight: 700, color: "var(--color-navy)", letterSpacing: "-0.02em", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--color-accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.875rem", fontWeight: 800, fontStyle: "italic", flexShrink: 0 }}>
                T
              </span>
              {footer.brand}
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.7, maxWidth: 300 }}>
              {footer.tagline}
            </p>
          </div>

          {/* Links Columns */}
          {footer.columns.map((col, idx) => (
            <div key={idx}>
              <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-4)" }}>
                {col.heading}
              </h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {col.links.map((link, lidx) => (
                  <li key={lidx}>
                    <Link href={link.href} style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", transition: "color var(--dur-fast)" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-accent)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-secondary)"}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom */}
        <div style={{ textAlign: "center", paddingTop: "var(--space-8)", borderTop: "1px solid var(--color-border-light)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          {footer.copyright}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: var(--space-8) !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
