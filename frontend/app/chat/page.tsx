import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wawancara AI",
  description: "Mulai wawancara kredit dengan AI analis kami",
};

/**
 * Chat Page — Halaman utama wawancara AI
 *
 * Komponen penuh (ChatBubble, ChatInput, Session management)
 * akan diimplementasikan di Day 2.
 *
 * Saat ini menampilkan shell layout yang sudah final.
 */
export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
            T
          </div>
          <div>
            <div className="font-semibold text-slate-100 text-sm leading-tight" style={{ fontFamily: "var(--font-sora)" }}>
              Tahu AI
            </div>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Online
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 px-3 py-1 rounded-full border border-slate-700 bg-slate-900">
            Sesi Baru
          </div>
          {/* Progress bar placeholder */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" />
            </div>
            <span>0%</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4" id="chat-messages">
        {/* Welcome message placeholder */}
        <div className="flex gap-3 max-w-2xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shrink-0 mt-1">
            T
          </div>
          <div className="bubble-ai px-4 py-3 text-sm leading-relaxed">
            <p className="text-slate-100 font-medium mb-1">Halo! Saya Tahu AI. 👋</p>
            <p className="text-slate-400 text-xs">
              Saya akan membantu menilai kelayakan kredit usahamu melalui percakapan singkat.
              Tidak perlu formulir panjang — cukup cerita saja!
            </p>
            <p className="text-slate-400 text-xs mt-2">
              <strong className="text-slate-300">Day 2:</strong> Chat fungsional akan aktif di sini.
              Termasuk real-time messaging, session management, dan Supabase Realtime.
            </p>
          </div>
        </div>
      </main>

      {/* Chat Input */}
      <div className="shrink-0 px-4 pb-6 pt-3 border-t border-slate-800">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          {/* Upload button placeholder */}
          <button
            id="btn-upload-doc"
            aria-label="Upload dokumen"
            className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors shrink-0"
            disabled
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              id="chat-input"
              placeholder="Cerita tentang usahamu... (aktif Day 2)"
              rows={1}
              disabled
              className="w-full resize-none bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-400 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Send button */}
          <button
            id="btn-send-message"
            aria-label="Kirim pesan"
            disabled
            className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white opacity-40 shrink-0 cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">
          Chat fungsional tersedia mulai Day 2
        </p>
      </div>
    </div>
  );
}
