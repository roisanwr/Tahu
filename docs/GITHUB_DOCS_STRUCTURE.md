# Struktur Dokumentasi GitHub & Alur Perubahan — UMKM Credit Scoring

Ini panduan ringkas dan mudah dipahami untuk menata dokumentasi di GitHub dan cara melacak setiap perubahan. Aku tulis pake bahasa santai supaya gampang diikuti.

## 1. Struktur folder repo (recommended)

proyek-umkm/
├── README.md
├── LICENSE
├── frontend/
├── backend/
├── db/
│   └── migrations/
├── docs/
│   ├── CHANGELOG.md
│   ├── ADRs/
│   │   └── 2026-04-21-decision-example.md
│   ├── VERSIONS.md
│   ├── RELEASE_NOTES.md
│   ├── PR_TEMPLATE.md
│   ├── ISSUE_TEMPLATE.md
│   └── CONTRIBUTING.md
├── scripts/
└── PENDAHULUAN.md

Catatan: file-file teknis yang sudah kita buat (MASTER_PLAN.md, API_SPEC.md, SCORING_RULES.md, PROMPTS.md, DB_SCHEMA.sql, DEPLOYMENT_CHECKLIST.md) taruh di root atau `docs/` menurut preferensi — yang penting jelas lokasinya.

---

## 2. Penjelasan singkat tiap file/folder (pakai bahasa gampang)

- README.md
  - Halaman pertama orang lihat. Tulis tujuan proyek, cara menjalankan lokal, link demo, kontak.
- LICENSE
  - Lisensi proyek (misal MIT).
- frontend/
  - Kode Next.js, komponen UI, styling.
- backend/
  - FastAPI, koneksi ke DB, logika scoring.
- db/migrations/
  - Semua skrip migration SQL. Nama file pake timestamp agar urut.
- docs/CHANGELOG.md
  - Catatan perubahan: apa yang berubah, kapan, siapa.
- docs/ADRs/
  - Architecture Decision Records. Setiap keputusan besar (mis. pakai Azure OCR) tulis di sini.
- docs/VERSIONS.md
  - Versi project, versi API, versi scoring rules, versi prompts.
- docs/RELEASE_NOTES.md
  - Ringkasan rilis (untuk presentasi ke juri atau stakeholder).
- docs/PR_TEMPLATE.md
  - Checklist PR (tes, docs, migration, dll) — pakai supaya standar.
- docs/ISSUE_TEMPLATE.md
  - Template untuk buat issue (bug/feature/task).
- docs/CONTRIBUTING.md
  - Cara kontribusi: branch naming, commit message, reviewer.
- scripts/
  - Script bantu (seed DB, local dev, build helpers).
- PENDAHULUAN.md
  - Dokumen living yang menjelaskan scope, area abu-abu, prioritas.

---

## 3. Alur perubahan simpel (step-by-step pake bahasa kasual)

1. Buat Issue dulu di GitHub. Jelasin singkat: masalah, kenapa perlu, siapa ngerjain, deadline.
2. Kalau keputusan arsitektural perlu diambil (mis. ubah bobot scoring), buat ADR di `docs/ADRs/` sebelum ngerjain.
3. Buat branch baru dari main: `feature/123-nama-singkat` atau `fix/45-bug-scorer`.
4. Coding di branch itu. Kalau ubah database, tambahin migration di `db/migrations/`.
5. Update file terkait: `SCORING_RULES.md`, `PROMPTS.md`, atau `API_SPEC.md` kalau ada perubahan logic.
6. Update `docs/CHANGELOG.md` (draft entry) dan bump versi di `docs/VERSIONS.md` jika perlu.
7. Buat PR ke `main`. PR harus pakai `docs/PR_TEMPLATE.md` checklist: tests, docs updated, migration added, ADR linked.
8. Reviewer nge-review. Kalau OK → merge. Gunakan squash atau merge commit sesuai policy.
9. Setelah merge, jalankan migration di staging/prod sesuai urutan; update `RELEASE_NOTES.md`.
10. Tag release (mis. `v0.1.0`) kalau milestone selesai.

---

## 4. Template singkat (copy-paste mudah)

### ADR template (docs/ADRs/YYYY-MM-DD-judul.md)
```
# ADR - <Nomor> — <Judul Keputusan>
Date: 2026-04-21
Status: Proposed | Accepted | Superseded

Context:
- Jelasin masalah singkat.

Decision:
- Keputusan yang diambil.

Consequences:
- Dampak + langkah migrasi atau rollback.

Related:
- Issue: #NN
- PR: #NN
```

### PR checklist (docs/PR_TEMPLATE.md)
```
- [ ] Code compiles and tests pass
- [ ] Docs updated (SCORING_RULES.md / PROMPTS.md / API_SPEC.md)
- [ ] Migration added (db/migrations/) if DB changed
- [ ] ADR created/updated if architectural decision
- [ ] CHANGELOG.md entry drafted
- [ ] Reviewer assigned
```

### CHANGELOG entry (docs/CHANGELOG.md)
```
## [Unreleased]
### Added
- (Issue #NN) Menambahkan endpoint /geoscore
### Changed
- (PR #NN) Perubahan bobot scoring financial 35% -> 40%
### Fixed
- (PR #NN) Koreksi normalisasi score
```

### Migration naming convention
```
2026_04_21__add_geospatial_table.sql
2026_04_22__alter_credit_assessments_add_field.sql
```

### Commit message examples (Conventional Commits)
```
feat(scoring): add location scoring function
fix(ocr): handle rotated images
docs(api): update /calculate-score response schema
```

---

## 5. Rekomendasi GitHub settings & automasi singkat

- Aktifkan branch protection di `main` (require PR reviews, pass CI).
- Pakai `CODEOWNERS` untuk assign reviewer otomatis ke folder `scoring/` atau `backend/`.
- Setup GitHub Actions untuk: lint, unit test, build frontend, run migrations on staging (manual).
- Aktifkan Dependabot untuk dependency security.
- Gunakan Issue labels (bug, feature, enhancement, blocker) untuk prioritas.

---

## 6. Praktik harian yang simpel

- Jangan merge tanpa PR dan docs update.
- Tulis pesan commit singkat dan jelas.
- Bikin ADR untuk keputusan besar (supaya nanti nggak lupa alasan kenapa ambil keputusan itu).
- Setiap perubahan scoring/DB wajib punya migration dan update `VERSIONS.md`.

---

Kalau mau, aku bisa langsung buat file template ini di repo (CHANGELOG.md, PR_TEMPLATE.md, ADR sample, VERSIONS.md). Mau aku buat sekarang?