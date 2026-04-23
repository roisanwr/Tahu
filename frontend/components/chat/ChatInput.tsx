"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { OCRScanningOverlay } from "./OCRScanningOverlay";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSend: () => void;
  onFileUpload?: (file: File, previewUrl: string) => void;
  onFileCancel?: () => void;
  disabled?: boolean;
}

export function ChatInput({ inputValue, setInputValue, onSend, onFileUpload, onFileCancel, disabled }: ChatInputProps) {
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewFile, setPreviewFile]     = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null);
  const [showOCR, setShowOCR]             = useState(false);

  // Reset textarea height when inputValue clears (e.g., after sending)
  useEffect(() => {
    if (inputValue === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [inputValue]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && inputValue.trim()) onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(url);
    setShowOCR(true);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleOCRComplete = (result: { totalAmount: number; date: string; merchant: string }) => {
    setShowOCR(false);
    if (previewFile && previewUrl && onFileUpload) {
      onFileUpload(previewFile, previewUrl);
    }
    // Clear preview
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const dismissPreview = () => {
    setPreviewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setShowOCR(false);
  };

  return (
    <div style={{ padding: "12px 16px 16px", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", zIndex: 10, flexShrink: 0 }}>

      {/* OCR Overlay — shown above input while scanning */}
      {showOCR && previewFile && (
        <div style={{ marginBottom: 12 }}>
          <OCRScanningOverlay
            isVisible={showOCR}
            fileName={previewFile.name}
            onComplete={handleOCRComplete}
            onFail={() => {
              dismissPreview();
              if (onFileCancel) onFileCancel();
            }}
          />
        </div>
      )}

      {/* Image preview chip (before OCR starts) */}
      {previewUrl && !showOCR && (
        <div style={{
          marginBottom: 10,
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px",
          background: "var(--color-accent-light)",
          borderRadius: 10,
          border: "1px solid var(--color-border)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="preview" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-navy)", flex: 1 }}>
            {previewFile?.name}
          </span>
          <button onClick={dismissPreview} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {disabled && !showOCR && (
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, fontStyle: "italic" }}>
          Lanjutkan proses di atas sebelum mengetik lagi...
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Paperclip button → triggers file input */}
        <button
          disabled={disabled || showOCR}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 44, height: 44, borderRadius: "50%", background: "var(--color-surface)",
            border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center",
            color: disabled || showOCR ? "var(--color-border)" : "var(--color-navy)",
            cursor: disabled || showOCR ? "not-allowed" : "pointer", transition: "all 0.2s", flexShrink: 0,
          }}
          onMouseEnter={e => { if (!disabled && !showOCR) { e.currentTarget.style.background = "var(--color-bg)"; e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; } }}
          onMouseLeave={e => { if (!disabled && !showOCR) { e.currentTarget.style.background = "var(--color-surface)"; e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-navy)"; } }}
          title="Upload dokumen (foto nota, struk, dll)"
        >
          <Paperclip size={20} style={{ transform: "rotate(45deg)" }} />
        </button>

        {/* Text area wrapper */}
        <div style={{ flex: 1, background: "var(--color-bg)", borderRadius: 24, border: "1px solid var(--color-border)", display: "flex", alignItems: "flex-end", padding: "4px 4px 4px 16px", transition: "border-color 0.2s" }}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled || showOCR}
            placeholder={showOCR ? "Mengekstrak data dokumen..." : disabled ? "AI sedang mengetik..." : "Ceritain usahamu di sini..."}
            rows={1}
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: "var(--color-text-primary)", padding: "10px 0",
              resize: "none", minHeight: "20px", maxHeight: "120px", lineHeight: "1.4",
              fontFamily: "inherit", overflowY: "auto",
            }}
          />

          <button
            onClick={onSend}
            disabled={disabled || showOCR || !inputValue.trim()}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: (disabled || showOCR || !inputValue.trim()) ? "var(--color-border)" : "var(--color-accent)",
              border: "none", color: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: (disabled || showOCR || !inputValue.trim()) ? "not-allowed" : "pointer",
              transition: "all 0.2s", marginLeft: 8, flexShrink: 0,
            }}
          >
            <Send size={16} strokeWidth={2.5} style={{ marginLeft: -2, marginTop: 2, transform: "rotate(-45deg)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
