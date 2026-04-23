"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X, Save, Building2, User, LayoutGrid, MapPin, Users } from "lucide-react";

export interface BusinessProfileData {
  business_name: string;
  owner_name: string;
  category: string;
  description: string;
  employee_count: number;
  location_address: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: BusinessProfileData;
  onSave: (data: BusinessProfileData) => void;
}

export function EditProfileModal({ isOpen, onClose, initialData, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<BusinessProfileData>(initialData);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(modalRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.1)" }
      );
    }
  }, [isOpen, initialData]);

  const handleClose = () => {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
    gsap.to(modalRef.current, {
      opacity: 0, y: 20, scale: 0.95, duration: 0.2,
      onComplete: onClose
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, opacity: 0
      }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)", borderRadius: 20,
          width: "100%", maxWidth: 500, maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)", opacity: 0, overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-navy)", margin: 0 }}>Pengaturan Profil Usaha</h2>
          <button
            onClick={handleClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-muted)" }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "24px", overflowY: "auto" }}>
          <form id="edit-profile-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-navy)", display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={14} /> Nama Usaha
              </label>
              <input
                type="text" required
                value={formData.business_name}
                onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--color-border)"}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-navy)", display: "flex", alignItems: "center", gap: 6 }}>
                <User size={14} /> Nama Pemilik
              </label>
              <input
                type="text" required
                value={formData.owner_name}
                onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--color-border)"}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-navy)", display: "flex", alignItems: "center", gap: 6 }}>
                <LayoutGrid size={14} /> Kategori Bisnis
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 14, outline: "none", background: "var(--color-surface)", cursor: "pointer", transition: "border-color 0.2s" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--color-border)"}
              >
                <option value="F&B / Kuliner">F&B / Kuliner</option>
                <option value="Retail / Toko Kelontong">Retail / Toko Kelontong</option>
                <option value="Jasa">Jasa</option>
                <option value="Online Shop">Online Shop</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-navy)", display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={14} /> Jumlah Karyawan
              </label>
              <input
                type="number" min="0" required
                value={formData.employee_count}
                onChange={e => setFormData({ ...formData, employee_count: parseInt(e.target.value) || 0 })}
                style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--color-border)"}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-navy)", display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} /> Alamat Operasional
              </label>
              <textarea
                required rows={3}
                value={formData.location_address}
                onChange={e => setFormData({ ...formData, location_address: e.target.value })}
                style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 14, outline: "none", resize: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--color-border)"}
              />
            </div>
            
            {/* Info Message */}
            <div style={{ padding: "10px 14px", background: "var(--color-bg)", borderRadius: 10, border: "1px dashed var(--color-border)", fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              <strong>Catatan Integritas:</strong> Perubahan profil di atas tidak akan mengubah Skor Kredit atau Rekomendasi Pinjaman Anda dari sesi asesmen yang sudah berjalan.
            </div>

          </form>
        </div>

        {/* Footer CTA */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 12, background: "var(--color-bg)" }}>
          <button
            type="button" onClick={handleClose}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "transparent", color: "var(--color-text-primary)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Batal
          </button>
          <button
            type="submit" form="edit-profile-form"
            style={{ padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, border: "none", background: "var(--color-accent)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-dark)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent)"}
          >
            <Save size={16} strokeWidth={2.5} />
            Simpan Perubahan
          </button>
        </div>

      </div>
    </div>
  );
}
