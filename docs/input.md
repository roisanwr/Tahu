1. Lokasi usaha (Wajib)
   - Cara input: Chatbot (input alamat / share lokasi)
   - Proses: Hitung skor lokasi (berdasarkan jarak ke area potensial, keramaian, dll)
   - Output: Nilai lokasi
   - Score: Skor lokasi (0–100)
   - Rumus: -

2. Nama usaha (Wajib)
   - Cara input: Chatbot (teks)
   - Output: Nama usaha
   - Score: -
   - Rumus: -

3. Nama pemilik / NIK (Wajib)
   - Cara input: Chatbot (teks / angka)
   - Output: Data identitas pemilik
   - Score: -
   - Rumus: -

4. Kategori usaha (Wajib)
   - Cara input: Chatbot (pilihan / teks)
   - Output: Kategori usaha
   - Score: Skor kategori (0–100)
   - Rumus: -

5. Lama usaha berdiri (Wajib)
   - Cara input: Chatbot (angka / tahun)
   - Output: Lama usaha (tahun)
   - Score: Skor pengalaman usaha (0–100)
   - Rumus: -

6. Jumlah karyawan (Wajib)
   - Cara input: Chatbot (angka)
   - Output: Jumlah karyawan
   - Score: Skor skala usaha (0–100)
   - Rumus: -

7. Foto tempat usaha (Opsional)
   - Cara input: Upload via chatbot
   - Proses: Analisis visual sederhana (kelayakan, kondisi tempat)
   - Output: Penilaian kondisi usaha
   - Score: Skor visual usaha (0–100)
   - Rumus: -

8. Video pitching (Opsional)
   - Cara input: Upload / link via chatbot
   - Proses: Analisis konten (kejelasan usaha, komunikasi, potensi)
   - Output: Penilaian presentasi usaha
   - Score: Skor pitching (0–100)
   - Rumus: -



   1. Estimasi omzet per bulan (Wajib)
   - Cara input: Chatbot
   - Sumber data: Self-reported
   - Output: Nilai omzet bulanan
   - Score: Skor omzet (0–100)
   - Rumus:

2. Estimasi pengeluaran operasional (Wajib)
   - Cara input: Chatbot
   - Output: Nilai pengeluaran + rasio profit
   - Score: Skor efisiensi (0–100)
   - Rumus:
            
3. Frekuensi transaksi (harian/mingguan) (Wajib)
   - Cara input: Chatbot
   - Output: Rata-rata transaksi
   - Score: Skor aktivitas usaha (0–100)
   - Rumus: 

4. Upload foto nota / struk transaksi (opsional)
   - Cara input: Upload gambar
   - Proses: OCR ekstrak angka otomatis
   - Output: Total transaksi terverifikasi + validasi omzet
   - Score: Skor kepercayaan data (0–100)
   - Rumus: 

5. Upload buku kas manual (foto) (Opsional)
   - Cara input: Upload gambar
   - Proses: OCR + AI parsing
   - Output: Ringkasan cashflow
   - Score: Skor konsistensi pencatatan (0–100)
   - Rumus: 

6. Screenshot rekening koran (informal) (Opsional)
   - Cara input: Upload gambar
   - Proses: OCR parsing
   - Output: Mutasi rekening + validasi arus kas
   - Score: Skor kredibilitas finansial (0–100)
   - Rumus: 

7. Riwayat pinjaman sebelumnya (Wajib)
   - Cara input: Form manual
   - Output: Status histori pinjaman
   - Score: Skor risiko kredit (0–100)
   - Rumus:

8. Aset yang dimiliki (motor, mesin, dll) (Wajib)
   - Cara input: Checklist + estimasi nilai
   - Output: Total nilai aset
   - Score: Skor kapasitas/jaminan (0–100)
   - Rumus:


   1. Link toko marketplace (Tokopedia / Shopee / Lazada) (Opsional)
   - Cara input: Input URL via chatbot
   - Proses: Scraping publik atau API resmi
   - Output: Data performa toko (penjualan, produk, rating)
   - Score: Skor performa marketplace (0–100)
   - Rumus: -

2. Screenshot dashboard penjualan marketplace (Opsional)
   - Cara input: Upload gambar
   - Proses: OCR + AI parsing angka
   - Output: Data penjualan terverifikasi
   - Score: Skor validasi data marketplace (0–100)
   - Rumus: -

3. Jumlah rating & ulasan toko (Opsional)
   - Cara input: Auto-fetch dari link atau input manual
   - Output: Rating rata-rata + jumlah ulasan
   - Score: Skor reputasi toko (0–100)
   - Rumus: -

4. Data QRIS / transaksi e-wallet (GoPay, OVO, Dana) (Opsional)
   - Cara input: Connect OAuth atau upload mutasi
   - Proses: Fintech open banking / parsing data
   - Output: Volume & frekuensi transaksi digital
   - Score: Skor adopsi digital (0–100)
   - Rumus: -

5. Follower & engagement media sosial (Instagram, TikTok) (Opsional)
   - Cara input: Input URL atau connect API
   - Proses: Proxy reputasi brand
   - Output: Jumlah follower + engagement rate
   - Score: Skor brand awareness (0–100)
   - Rumus: -

6. Jumlah konten produk yang diposting (Opsional)
   - Cara input: Auto-fetch dari sosial media / marketplace
   - Output: Jumlah posting produk
   - Score: Skor aktivitas pemasaran (0–100)
   - Rumus: -

7. WhatsApp Business verified (Opsional)
   - Cara input: Input nomor / verifikasi status
   - Output: Status verified / tidak
   - Score: Skor kredibilitas komunikasi (0–100)
   - Rumus: -



   1. Kuesioner psikometrik (30–50 pertanyaan) (Opsional)
   - Cara input: Form in-app / chatbot
   - Proses: Mengukur risk appetite, kejujuran, disiplin finansial
   - Output: Profil psikometrik pengguna
   - Score: Skor psikometrik (0–100)
   - Rumus: -

2. Pola jawaban (waktu per soal, perubahan jawaban) (Opsional)
   - Cara input: Otomatis dicatat sistem
   - Proses: Behavioral signal analysis
   - Output: Pola konsistensi & kepercayaan jawaban
   - Score: Skor konsistensi perilaku (0–100)
   - Rumus: -

3. Permainan keputusan finansial sederhana (gamifikasi) (Opsional)
   - Cara input: Mini game in-app
   - Proses: Simulasi pengambilan keputusan
   - Output: Pola keputusan finansial pengguna
   - Score: Skor pengambilan keputusan (0–100)
   - Rumus: -

4. Skor literasi keuangan (kuis) (Opsional)
   - Cara input: Kuis in-app
   - Proses: Evaluasi pemahaman finansial dasar
   - Output: Nilai literasi keuangan
   - Score: Skor literasi (0–100)
   - Rumus: -



   1. Lokasi usaha (koordinat GPS) (Wajib)
   - Cara input: Auto-detect atau pin di peta
   - Proses: Pengambilan koordinat lokasi
   - Output: Titik koordinat usaha
   - Score: Skor lokasi dasar (0–100)
   - Rumus: -

2. Kepadatan area bisnis di sekitar lokasi (Opsional)
   - Cara input: Otomatis dari data geospasial
   - Proses: Analisis kepadatan usaha di sekitar
   - Output: Indeks kepadatan bisnis
   - Score: Skor potensi pasar (0–100)
   - Rumus: -

3. Akses ke infrastruktur (jalan, pasar, bank terdekat) (Opsional)
   - Cara input: Otomatis dari peta
   - Proses: Analisis kedekatan dengan fasilitas penting
   - Output: Jarak ke infrastruktur utama
   - Score: Skor aksesibilitas (0–100)
   - Rumus: -

4. Indeks ekonomi daerah (Opsional)
   - Cara input: Otomatis dari dataset publik :contentReference[oaicite:0]{index=0}
   - Proses: Mapping lokasi ke data ekonomi wilayah
   - Output: Indeks ekonomi regional
   - Score: Skor kondisi ekonomi (0–100)
   - Rumus: -


   catatan setiap data input wajib itu = model basic 
   setiap data input opsional itu = model advanced

   jadi kalo lender peminjam pengen cepet nyarinya yaa yang basic tapi klo nilai nya gede dan butuh lebih meyakinkan yang advance

   di inputan chat bot sendiri mencakup advanced dan basic yang menentukan advanced atau basic sendiri adalah inputan dari user