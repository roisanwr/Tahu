"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X, MapPin, Search, CheckCircle2, Navigation } from "lucide-react";

interface MapBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: { address: string; lat: number; lng: number }) => void;
  onCancel?: () => void;
}

// Mock address suggestions
const SUGGESTIONS = [
  { label: "Jl. Sudirman No. 45, Setiabudi, Jakarta Selatan", lat: -6.2088, lng: 106.8172 },
  { label: "Pasar Tanah Abang Blok A, Tanah Abang, Jakarta Pusat", lat: -6.1865, lng: 106.8138 },
  { label: "Jl. Gatot Subroto No. 12, Pancoran, Jakarta Selatan", lat: -6.2318, lng: 106.8396 },
  { label: "Jl. Kebon Jeruk Raya No. 8, Kebon Jeruk, Jakarta Barat", lat: -6.1942, lng: 106.7749 },
  { label: "Jl. Mangga Dua Raya, Sawah Besar, Jakarta Pusat", lat: -6.1422, lng: 106.8226 },
];

export function MapBottomSheet({ isOpen, onClose, onConfirm, onCancel }: MapBottomSheetProps) {
  const sheetRef   = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery]       = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<typeof SUGGESTIONS[0] | null>(null);
  const [pinDropped, setPinDropped]           = useState(false);

  const filteredSuggestions = SUGGESTIONS.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Animate in/out
  useEffect(() => {
    if (!sheetRef.current || !overlayRef.current) return;

    if (isOpen) {
      gsap.set(sheetRef.current, { y: "100%" });
      gsap.set(overlayRef.current, { opacity: 0 });
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.to(sheetRef.current, { y: "0%", duration: 0.45, ease: "cubic-bezier(0.16, 1, 0.3, 1)" });
    } else {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: "power2.in" });
      gsap.to(sheetRef.current, { y: "100%", duration: 0.35, ease: "power2.in" });
    }
  }, [isOpen]);

  const handleSelectSuggestion = (s: typeof SUGGESTIONS[0]) => {
    setSelectedAddress(s);
    setSearchQuery(s.label);
    setShowSuggestions(false);
    setPinDropped(false);
    // Animate pin drop
    setTimeout(() => setPinDropped(true), 100);
  };

  const handleConfirm = () => {
    if (!selectedAddress) return;
    onConfirm({ address: selectedAddress.label, lat: selectedAddress.lat, lng: selectedAddress.lng });
    onClose();
    setSearchQuery("");
    setSelectedAddress(null);
    setPinDropped(false);
  };

  if (!isOpen && typeof window !== "undefined") {
    // Still render for GSAP animation out — controlled by gsap translate
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(13, 18, 30, 0.55)",
          zIndex: 200,
          opacity: 0,
          display: isOpen ? "block" : "none",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          background: "var(--color-surface)",
          borderRadius: "24px 24px 0 0",
          zIndex: 201,
          transform: "translateY(100%)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          overflow: "hidden",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        }}
      >
        {/* Drag Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, background: "var(--color-border)", borderRadius: 99 }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 20px 16px",
          borderBottom: "1px solid var(--color-border)",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-navy)", letterSpacing: "-0.3px" }}>
              Pin Lokasi Usaha
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
              Cari atau ketuk peta untuk memilih lokasi
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--color-bg)", border: "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--color-text-primary)", transition: "all 0.2s",
            }}
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "16px 20px 0", position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--color-bg)",
            border: "1.5px solid var(--color-border)",
            borderRadius: 12,
            padding: "10px 14px",
            transition: "border-color 0.2s",
          }}
            onFocus={() => setShowSuggestions(true)}
          >
            <Search size={16} color="var(--color-text-muted)" strokeWidth={2} />
            <input
              type="text"
              placeholder="Cari nama jalan, gedung, atau wilayah..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              style={{
                flex: 1, border: "none", background: "transparent", outline: "none",
                fontSize: 13, color: "var(--color-text-primary)", fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSelectedAddress(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% - 2px)", left: 20, right: 20,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "0 0 12px 12px",
              boxShadow: "var(--shadow-lg)",
              zIndex: 10,
              overflow: "hidden",
            }}>
              {filteredSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    width: "100%", padding: "11px 14px",
                    background: "transparent", border: "none",
                    borderTop: i > 0 ? "1px solid var(--color-border-light)" : "none",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <MapPin size={14} color="var(--color-accent)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--color-navy)", lineHeight: 1.45 }}>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map area — OpenStreetMap iframe */}
        <div style={{ margin: "16px 20px 0", borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-border)", flexShrink: 0, height: 220, position: "relative" }}>
          <iframe
            src={
              selectedAddress
                ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedAddress.lng - 0.01},${selectedAddress.lat - 0.008},${selectedAddress.lng + 0.01},${selectedAddress.lat + 0.008}&layer=mapnik&marker=${selectedAddress.lat},${selectedAddress.lng}`
                : "https://www.openstreetmap.org/export/embed.html?bbox=106.7,−6.25,106.9,−6.10&layer=mapnik"
            }
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Peta Lokasi Usaha"
            loading="lazy"
          />
          {/* Overlay pin animation */}
          {pinDropped && selectedAddress && (
            <div style={{
              position: "absolute", top: 8, left: 8,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "6px 10px",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "var(--shadow-md)",
            }}>
              <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-navy)" }}>Lokasi dipilih</span>
            </div>
          )}
        </div>

        {/* Detected location chip */}
        {selectedAddress && (
          <div style={{ margin: "12px 20px 0", padding: "10px 14px", background: "var(--color-accent-light)", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <MapPin size={14} color="var(--color-accent)" strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent-dark)", lineHeight: 1.45 }}>
              {selectedAddress.label}
            </span>
          </div>
        )}

        {/* GPS auto-detect */}
        {!selectedAddress && (
          <div style={{ margin: "12px 20px 0" }}>
            <button
              onClick={() => handleSelectSuggestion(SUGGESTIONS[0])}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "10px 14px",
                background: "transparent", border: "1.5px dashed var(--color-border)",
                borderRadius: 10, cursor: "pointer",
                fontSize: 13, fontWeight: 600, color: "var(--color-navy)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-navy)"; }}
            >
              <Navigation size={15} strokeWidth={2} />
              Gunakan Lokasi Saya Saat Ini
            </button>
          </div>
        )}

        {/* Confirm button */}
        <div style={{ padding: "16px 20px 28px" }}>
          <button
            onClick={handleConfirm}
            disabled={!selectedAddress}
            style={{
              width: "100%", padding: "15px",
              background: selectedAddress ? "var(--color-accent)" : "var(--color-border)",
              color: "#fff",
              border: "none", borderRadius: 14,
              fontSize: 14, fontWeight: 700,
              cursor: selectedAddress ? "pointer" : "not-allowed",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              letterSpacing: "0.01em",
              marginBottom: 12,
            }}
            onMouseEnter={e => { if (selectedAddress) e.currentTarget.style.background = "var(--color-accent-dark)"; }}
            onMouseLeave={e => { if (selectedAddress) e.currentTarget.style.background = "var(--color-accent)"; }}
          >
            {selectedAddress ? `Konfirmasi — ${selectedAddress.label.split(",")[0]}` : "Pilih lokasi terlebih dahulu"}
          </button>
          
          <button
            onClick={() => {
              if (onCancel) onCancel();
              onClose();
            }}
            style={{
              width: "100%", padding: "12px",
              background: "transparent", color: "var(--color-text-muted)",
              border: "none", borderRadius: 14,
              fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--color-navy)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-muted)"}
          >
            Tolak Akses & Ketik Manual Saja
          </button>
        </div>
      </div>
    </>
  );
}
