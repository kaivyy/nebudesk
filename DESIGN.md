# NebuDesk Design Direction (DESIGN.md)

> Catatan: Arah desain ini disusun oleh agen berdasarkan konfirmasi minimal brief pengguna. Sesuai prinsip antislop, dokumen ini menjadi referensi identitas dan mood visual agar antarmuka konsisten dan terhindar dari generic AI-slop.

---

## 1. Identitas & Karakter (Identity & Personality)
- **Produk**: NebuDesk - Cloud Web Desktop Environment & Remote Developer Workspace.
- **Karakter**: Presisi, fungsional, elegan, dan berorientasi desktop native (macOS-inspired).
- **Target Pengguna**: Software engineers, power users, dan self-hosters yang membutuhkan lingkungan kerja remote yang responsif dan minim distraksi.
- **Filosofi**: Craftsmanship Over Decoration. Tidak ada elemen kosmetik tanpa fungsi; setiap tombol, menu, dan status bar memiliki kegunaan nyata.

---

## 2. Parameter Dials (R-37)
- **ENERGY: 2 / 5** - Tenang, fokus, tidak ada efek glow atau warna neon mencolok yang mengganggu konsentrasi coding.
- **RHYTHM: 3 / 5** - Struktur window dan desktop seimbang, grid rapi, padding proporsional.
- **MOTION: 2 / 5** - Transisi halus dan cepat (150ms-200ms), menyerupai window management native tanpa animasi berlebihan.

---

## 3. Palet Warna (Color Palette)

### Dark Mode (Default IDE & Terminal)
- **Background Utama**: `#1e1e1e` (Editor & Window Body)
- **Background Sidebar/Panel**: `#252526` / `#2d2d2d`
- **Border & Separator**: `#333333` / `#3e3e42`
- **Teks Utama**: `#cccccc` (High contrast, WCAG AA compliant)
- **Teks Muted**: `#858585` (Ukuran minimum 11px, kontras terjaga)

### Light Mode (Docs, Finder, Sheets)
- **Background Utama**: `#ffffff`
- **Background Sekunder/Sidebar**: `#f3f3f3`
- **Border**: `#e5e7eb` (Gray-200)
- **Teks Utama**: `#111827` (Gray-900)

### Warna Aksen & Status
- **Aksen Utama**: macOS System Blue (`#007aff` / `#3b82f6`)
- **Success / Git Added**: Emerald (`#10b981`)
- **Warning / Git Modified**: Amber (`#f59e0b`)
- **Error / Git Deleted**: Crimson (`#ef4444`)

---

## 4. Tipografi (Typography)
- **Antarmuka (UI Text)**:
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  - Ukuran: Window title (13px semibold), Menu bar (13px medium), Explorer items (12px-13px), Status bar (11px).
- **Kode & Terminal (Monospace)**:
  `"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace`
  - Ukuran: Editor (13px, line-height 1.5), Terminal (12px, line-height 1.4).

---

## 5. Komitmen Kualitas Antislop (Anti-Slop Craftsmanship)
1. **Bebas Em Dash**: Teks UI menggunakan tanda baca natural (titik, koma, tanda hubung).
2. **Kelengkapan Fungsional (C-2)**: Setiap tombol dan menu item memiliki handler nyata atau ditiadakan.
3. **Ketahanan Status (R-27)**: Semua view yang memuat data menyediakan 3 status lengkap: Empty, Loading, dan Error.
4. **Aksesibilitas Kontras (R-25)**: Seluruh teks memenuhi standar kontras minimal WCAG AA (4.5:1 untuk normal, 3:1 untuk large).
5. **Responsivitas Layar (R-03)**: Window manager dan komponen beradaptasi fleksibel dengan batas minimal ukuran jendela yang aman.
