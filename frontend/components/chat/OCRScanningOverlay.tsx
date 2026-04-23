"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { CheckCircle2, FileImage } from "lucide-react";

type Stage = "scanning" | "reading" | "extracting" | "done";

interface OCRScanningOverlayProps {
  isVisible: boolean;
  fileName?: string;
  onComplete: (result: { totalAmount: number; date: string; merchant: string }) => void;
}

const STAGES: { stage: Stage; label: string; sub: string; duration: number }[] = [
  { stage: "scanning",    label: "Memindai dokumen...",      sub: "Mendeteksi teks & angka",        duration: 800  },
  { stage: "reading",     label: "Membaca konten...",        sub: "Azure AI Document Intelligence", duration: 900  },
  { stage: "extracting",  label: "Mengekstrak data...",      sub: "Parsing nominal & tanggal",      duration: 700  },
  { stage: "done",        label: "Ekstraksi selesai!",       sub: "Data siap dianalisis",           duration: 700  },
];

// Mock OCR result
const MOCK_OCR = {
  totalAmount: 2_450_000,
  date: "22 Apr 2026",
  merchant: "Toko Sembako Jaya",
};

export function OCRScanningOverlay({ isVisible, fileName = "dokumen.jpg", onComplete }: OCRScanningOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Reset when becomes visible
  useEffect(() => {
    if (!isVisible) {
      setCurrentStageIdx(0);
      setIsDone(false);
      return;
    }

    // Entrance animation
    if (overlayRef.current) {
      gsap.fromTo(overlayRef.current,
        { opacity: 0, scale: 0.95, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.3)" }
      );
    }

    // Scan line looping
    if (scanLineRef.current) {
      gsap.fromTo(scanLineRef.current,
        { top: "0%" },
        { top: "100%", duration: 1.1, ease: "power1.inOut", repeat: -1, yoyo: true }
      );
    }

    // Walk through stages
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    STAGES.forEach((s, i) => {
      const t = setTimeout(() => {
        setCurrentStageIdx(i);
        if (s.stage === "done") {
          setIsDone(true);
          if (scanLineRef.current) gsap.killTweensOf(scanLineRef.current);
          // After 600ms, call onComplete
          const finTimer = setTimeout(() => onComplete(MOCK_OCR), 600);
          timers.push(finTimer);
        }
      }, elapsed);
      timers.push(t);
      elapsed += s.duration;
    });

    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  if (!isVisible) return null;

  const currentStage = STAGES[currentStageIdx];

  return (
    <div
      ref={overlayRef}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        overflow: "hidden",
        padding: 0,
        opacity: 0,
        width: "100%",
        maxWidth: 300,
      }}
    >
      {/* Document preview + scan animation */}
      <div style={{
        position: "relative",
        height: 120,
        background: "linear-gradient(160deg, #F0FDF4, #ECFDF5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Faux receipt lines */}
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: 20, right: 20,
            height: 2,
            background: "rgba(13,107,79,0.08)",
            top: 16 + i * 15,
            borderRadius: 1,
          }} />
        ))}

        <FileImage size={32} color="var(--color-accent)" strokeWidth={1.5} style={{ position: "relative", zIndex: 1 }} />

        {/* Scan line */}
        {!isDone && (
          <div
            ref={scanLineRef}
            style={{
              position: "absolute",
              left: 0, right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #10B981, transparent)",
              boxShadow: "0 0 8px 2px rgba(16,185,129,0.4)",
              top: "0%",
              zIndex: 2,
            }}
          />
        )}

        {/* Done checkmark */}
        {isDone && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(236,253,245,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 3,
          }}>
            <CheckCircle2 size={36} color="#10B981" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Stage info */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-navy)", marginBottom: 3 }}>
          {currentStage.label}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 12 }}>
          {currentStage.sub}
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {STAGES.map((s, i) => {
            const isPast    = i < currentStageIdx;
            const isCurrent = i === currentStageIdx;
            return (
              <div key={s.stage} style={{
                height: 4,
                flex: isCurrent ? 2 : 1,
                borderRadius: 99,
                background: isPast || isCurrent
                  ? "var(--color-accent)"
                  : "var(--color-border)",
                transition: "flex 0.4s ease, background 0.3s ease",
                opacity: isPast ? 0.5 : 1,
              }} />
            );
          })}
        </div>

        {/* File label */}
        <div style={{ marginTop: 10, fontSize: 10, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
          {fileName}
        </div>
      </div>
    </div>
  );
}
