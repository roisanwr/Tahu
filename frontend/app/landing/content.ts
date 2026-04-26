/**
 * content.ts — skorinaja Landing Page
 * ─────────────────────────────────────────────────────────────
 * SEMUA teks landing page ada di sini.
 * Untuk mengubah kata-kata, cukup edit file ini.
 * Tidak perlu menyentuh file komponen sama sekali.
 * ─────────────────────────────────────────────────────────────
 */

export const content = {

  /* ── NAVBAR ──────────────────────────────────────────── */
  navbar: {
    brand: "skorinaja",
    links: [
      { label: "Cara Kerja", href: "#cara-kerja" },
      { label: "Keunggulan", href: "#keunggulan" },
      { label: "Testimoni", href: "#testimoni" },
    ],
    cta: "Mulai Sekarang",
    ctaHref: "/chat",
  },

  /* ── HERO ─────────────────────────────────────────────── */
  hero: {
    badge: "Platform Penilaian Kredit UMKM #1",
    headlineLine1: "Cerita Usahamu,",
    headlineLine2: "Kami yang Nilai.",
    subheadline:
      "Tidak perlu formulir panjang, tidak perlu laporan keuangan formal. " +
      "Cukup ngobrol santai dengan AI analis kredit kami — dan dapatkan profil kredit lengkap dalam hitungan menit.",
    ctaPrimary: "Mulai Wawancara Gratis",
    ctaPrimaryHref: "/chat",
    ctaSecondary: "Lihat Cara Kerjanya",
    ctaSecondaryHref: "#cara-kerja",
  },

  /* ── STATS BAR ────────────────────────────────────────── */
  stats: [
    { value: 12400, suffix: "+", label: "UMKM Terverifikasi", prefix: "" },
    { value: 97, suffix: "%", label: "Tingkat Kepuasan", prefix: "" },
    { value: 5, suffix: " mnt", label: "Rata-rata Waktu Proses", prefix: "<" },
    { value: 850, suffix: "", label: "Skor Kredit Tertinggi", prefix: "" },
  ],

  /* ── PROBLEM SECTION ─────────────────────────────────── */
  problem: {
    label: "Masalah yang Kami Selesaikan",
    title: "Formulir Panjang\nBukan Solusi.",
    subtitle:
      "64 juta pelaku UMKM di Indonesia butuh modal — tapi mayoritas gagal di tengah proses pengajuan kredit karena sistem yang tidak dirancang untuk mereka.",
    before: {
      label: "Cara Lama",
      items: [
        "Formulir 20+ halaman yang membingungkan",
        "Laporan keuangan formal yang tidak dimiliki",
        "Antri berjam-jam di kantor bank",
        "Menunggu keputusan berhari-hari",
        "Ditolak tanpa penjelasan yang jelas",
      ],
    },
    after: {
      label: "Cara skorinaja",
      items: [
        "Wawancara santai via chat AI — 5–10 menit",
        "Foto nota dan struk sudah cukup",
        "Dari mana saja, kapan saja, lewat HP",
        "Skor kredit tersedia dalam hitungan menit",
        "Penjelasan lengkap per dimensi penilaian",
      ],
    },
  },

  /* ── HOW IT WORKS ────────────────────────────────────── */
  howItWorks: {
    label: "Cara Kerja",
    title: "Tiga Langkah\nMenuju Profil Kredit.",
    subtitle: "Dirancang agar semudah mengobrol dengan teman — tanpa formulir, tanpa antri.",
    steps: [
      {
        number: "01",
        title: "Ngobrol dengan AI",
        description:
          "Ceritakan usaha kamu melalui percakapan santai. AI kami mengajukan pertanyaan yang tepat, satu per satu — layaknya berbicara dengan konsultan bisnis pribadi.",
        detail: "Bahasa Indonesia natural · Tanpa formulir",
      },
      {
        number: "02",
        title: "Kirim Dokumen",
        description:
          "Foto nota, struk, atau buku kas? Cukup kirim fotonya. Teknologi pembaca dokumen kami langsung mengekstrak angka-angka penting secara otomatis.",
        detail: "Foto nota & struk sudah cukup",
      },
      {
        number: "03",
        title: "Lihat Skor Kredit",
        description:
          "Dalam hitungan menit, lihat Kartu Kredit interaktif lengkap dengan rincian per dimensi dan rekomendasi pembiayaan yang sesuai profil usaha kamu.",
        detail: "Skor 300–850 · Penjelasan lengkap",
      },
    ],
  },

  /* ── FEATURES ────────────────────────────────────────── */
  features: {
    label: "Keunggulan",
    title: "Teknologi yang Bekerja\nuntuk Kamu.",
    subtitle:
      "Dibangun dengan standar enterprise, dirancang sesederhana mungkin untuk pelaku UMKM.",
    cards: [
      {
        icon: "💬",
        title: "Wawancara Percakapan",
        description:
          "Tidak ada formulir yang membosankan. AI kami mengobrol secara natural dalam Bahasa Indonesia, mengekstrak data bisnis dari cerita kamu.",
      },
      {
        icon: "📄",
        title: "Baca Dokumen Otomatis",
        description:
          "Upload foto nota, struk, atau catatan keuangan. Sistem pembaca dokumen kami langsung mengolah dan menyusun data secara otomatis.",
      },
      {
        icon: "📍",
        title: "Analisis Lokasi Usaha",
        description:
          "Pin lokasi usahamu di peta. Kami menganalisis potensi pasar, akses infrastruktur, dan kepadatan bisnis di area sekitar.",
      },
      {
        icon: "🛡️",
        title: "Analisis Karakter",
        description:
          "AI menilai konsistensi jawaban dan tingkat kooperatif — memberikan dimensi penilaian yang lebih manusiawi dan holistik.",
      },
    ],
    highlight: {
      title:
        "Skor Kredit Multi-Dimensi",
      description:
        "Menggabungkan 5 dimensi penilaian — keuangan, pengalaman, lokasi, dokumen, dan karakter — menjadi satu skor komprehensif 300–850 yang dipahami lembaga keuangan.",
      scoreValue: "742",
      scoreLabel: "Skor Kredit — Risiko Rendah",
      dimensions: [
        { name: "Keuangan", weight: "35%" },
        { name: "Pengalaman", weight: "20%" },
        { name: "Lokasi", weight: "15%" },
        { name: "Dokumen", weight: "15%" },
        { name: "Karakter", weight: "15%" },
      ],
    },
  },

  /* ── TESTIMONIALS ────────────────────────────────────── */
  testimonials: {
    label: "Testimoni",
    title: "Kata Mereka tentang\nskorinaja.",
    items: [
      {
        quote:
          "Saya kira harus isi formulir panjang dulu. Ternyata tinggal ngobrol dan kirim foto nota, sudah dapat skor kredit. Luar biasa mudahnya!",
        name: "Bu Sari Rahayu",
        role: "Pemilik Warung Makan",
        city: "Semarang",
        initials: "SR",
      },
      {
        quote:
          "Skornya keren banget — saya jadi paham kekuatan dan kelemahan usaha saya. Rekomendasi pinjamannya juga pas dengan kebutuhan saya.",
        name: "Budi Pratama",
        role: "Toko Daring Pakaian",
        city: "Bandung",
        initials: "BP",
      },
      {
        quote:
          "Dulu selalu ditolak bank karena tidak punya laporan keuangan formal. Dengan skorinaja, profil usaha saya akhirnya bisa dinilai secara adil.",
        name: "Andi Nugroho",
        role: "Jasa Logistik",
        city: "Surabaya",
        initials: "AN",
      },
    ],
  },

  /* ── CTA SECTION ─────────────────────────────────────── */
  cta: {
    title: "Siap skorinaja\nPotensi Kredit Usahamu?",
    subtitle:
      "Bergabung dengan ribuan pelaku UMKM yang sudah mendapatkan profil kredit mereka — gratis, cepat, dan tanpa ribet.",
    ctaLabel: "Mulai Wawancara Gratis",
    ctaHref: "/chat",
    note: "Tidak perlu kartu kredit · Gratis selamanya untuk UMKM",
  },

  /* ── FOOTER ──────────────────────────────────────────── */
  footer: {
    brand: "skorinaja",
    tagline:
      "Platform penilaian kredit berbasis AI untuk pelaku UMKM Indonesia. Mengubah percakapan menjadi peluang pembiayaan.",
    columns: [
      {
        heading: "Produk",
        links: [
          { label: "Skor Kredit", href: "#" },
          { label: "Dasbor UMKM", href: "#" },
          { label: "API untuk Pemberi Pinjaman", href: "#" },
        ],
      },
      {
        heading: "Perusahaan",
        links: [
          { label: "Tentang Kami", href: "#" },
          { label: "Karir", href: "#" },
          { label: "Blog", href: "#" },
        ],
      },
      {
        heading: "Legal",
        links: [
          { label: "Kebijakan Privasi", href: "#" },
          { label: "Syarat & Ketentuan", href: "#" },
          { label: "Keamanan Data", href: "#" },
        ],
      },
    ],
    copyright: "© 2026 skorinaja. Hak cipta dilindungi. Terdaftar di bawah pengawasan OJK.",
  },
};
