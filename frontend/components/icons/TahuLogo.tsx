import React from 'react';

interface skorinajaLogoProps {
  className?: string;
  size?: number;
}

export function skorinajaLogo({ className = "", size = 28 }: skorinajaLogoProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--color-accent)",
        color: "#fff",
        width: size,
        height: size,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.53, // Adjust font size proportionally
        fontStyle: "italic",
        userSelect: "none",
        flexShrink: 0
      }}
    >
      T
    </div>
  );
}
