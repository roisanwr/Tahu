🚀 MASTERPLAN: UMKM Credit Scoring Platform (Prototype Lomba)

Misi: Mengubah formulir pinjaman yang membosankan menjadi "Wawancara Cerdas" ala impress.ai!

🎯 1. Konsep Utama: "Hybrid Generative UI"

Aplikasi akan bertindak sebagai asisten analis kredit (AI). User (UMKM) akan "diwawancara" melalui antarmuka chat, lalu AI akan memproses data (obrolan & foto dokumen) untuk menghasilkan Credit Score Card yang interaktif.

Penyelesaian Masalah: Mengurangi drop-off rate pengisian form dengan antarmuka percakapan (Conversational UI).

The "Wow" Factor (Untuk Juri): Analisis sentimen dari gaya bahasa UMKM, ekstraksi data otomatis dari nota (OCR), dan perpindahan mulus dari obrolan teks ke Dashboard visual.

🏗️ 2. Arsitektur "Panggung Sulap" (Tech Stack 2026)

Kita menggunakan arsitektur Split Deployment agar aplikasi tahan banting, cepat, dan aman dari timeout saat lomba.

Peran

Teknologi

Tempat Deployment

Alasan Pemilihan

Front-End (Ruang Makan)

Next.js + Tailwind CSS

Vercel (Gratis)

Render UI dinamis (Generative UI), cepat, dan interaktif.

Back-End (Dapur Utama)

Python + FastAPI

Render.com / Koyeb

Kuat memproses logika AI lama, tidak terikat limit timeout Vercel. (Gunakan cron-job.org agar server tidak "tidur").

Database (Gudang Data)

Supabase (PostgreSQL)

Bawaan Supabase

Free tier awet (tidak expire), menyimpan riwayat chat & skor.

🤖 3. Pembagian Tugas AI (Hybrid AI Strategy)

Untuk menghindari kerumitan manajemen API Key dan menghemat biaya, kita fokus pada dua kekuatan utama:

AI Otak Utama (Gemini API - Free Tier):

Tugas: Berperan sebagai Chatbot, menanyakan progress usaha, mengekstrak "makna/angka" dari curhatan user, dan memberikan penilaian sentimen.

AI Spesialis Dokumen (Azure AI Document Intelligence):

Tugas: Membaca foto struk, mutasi bank, atau nota yang di-upload user, lalu mengekstrak angka riilnya.

Logika Hitung (Heuristik di Python):

Tugas: Menghitung skor final berdasarkan ekstraksi AI (Misal: 40% Finansial + 60% Karakter Psikometrik). Tidak perlu training model ML.

📂 4. Struktur Direktori (The Blueprint)

Gunakan struktur ini di dalam satu repositori utama:

proyek-lomba-umkm/
│
├── frontend/               <-- Deploy ke Vercel
│   ├── app/
│   │   ├── page.tsx        <-- Layar utama (Chat UI)
│   │   ├── dashboard/      <-- Halaman skor akhir
│   │   └── api/            <-- Route handler (jika perlu)
│   ├── components/         <-- (ChatBubble, Speedometer, UploadWidget)
│   └── lib/                <-- (Supabase client config)
│
└── backend/                <-- Deploy ke Render/Koyeb
    ├── main.py             <-- Core FastAPI app & Routing (CORS setup)
    ├── ai_agent.py         <-- Logika Gemini API (Prompt Engineering)
    ├── document_ocr.py     <-- Logika Azure Document Intelligence
    ├── database.py         <-- Koneksi ke Supabase PostgreSQL
    └── requirements.txt    <-- (fastapi, uvicorn, google-generativeai, supabase)


💾 5. Skema Database (Supabase / PostgreSQL)

Tiga tabel wajib untuk menyimpan memori sistem:

users_umkm: Menyimpan data dasar.

id, nama_pemilik, nama_usaha, created_at

sessions: Melacak sesi wawancara.

session_id, user_id, status (active/completed), created_at

chat_history: "Buku Rekaman" percakapan.

id, session_id, role (user/model), content (teks obrolan), created_at

credit_assessments: Hasil akhir kalkulasi.

id, session_id, extracted_financials (JSON), honesty_score, final_credit_score

🔄 6. Alur Data (Data Flow: Ekstraksi Chat)

Bagaimana mengubah obrolan menjadi data numerik?

Sambil Berjalan (Chatting): Tiap user membalas, Python menyimpan teksnya ke tabel chat_history.

Akhir Sesi (Ekstraksi): Saat bot memutuskan wawancara selesai, Python menarik semua baris dari chat_history.

Proses "Sekretaris": Python mengirim riwayat utuh tersebut ke Gemini dengan Prompt khusus: "Ekstrak data ini ke dalam format JSON berisi omzet, lama usaha, dan skor karakter".

Simpan & Tampilkan: Data JSON disimpan ke credit_assessments dan dikirim ke Next.js untuk me-render Speedometer Skor.