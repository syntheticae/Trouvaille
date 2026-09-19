# Trouvaille: Launch Strategy, Community Funding & Social Growth Blueprint

Dokumen ini adalah cetak biru (*master blueprint*) untuk mempublikasikan Trouvaille ke **Apple App Store** dan **Google Play Store**, strategi pendanaan komunitas transparan via **Crypto & QRIS**, kepatuhan regulasi Apple/Google (*anti-rejection policy*), serta rencana peluncuran akun **Instagram**.

---

## 1. Analisis Biaya & Kelayakan Rilis Publik

| Platform | Biaya Resmi | Siklus Pembayaran | Status Kelayakan | Opsi Rilis Gratis |
| :--- | :--- | :--- | :--- | :--- |
| **Google Play Store** | **$25 USD** (~Rp 400.000) | Sekali bayar seumur hidup | Sangat murah & mudah dicapai | Rilis file `.apk` mandiri di website / GitHub Releases (100% Gratis). |
| **Apple App Store** | **$99 USD** (~Rp 1.600.000) | Wajib per tahun (tahunan) | Membutuhkan *community funding* | Rilis sebagai PWA (Safari "Add to Home Screen") atau IPA via SideStore/AltStore (100% Gratis). |

> [!IMPORTANT]
> **Kebijakan Fee Waiver Apple**: Apple hanya menggratiskan biaya $99/tahun untuk organisasi nirlaba terdaftar (501(c)(3)), lembaga pendidikan terakreditasi, atau badan pemerintah. Akun pengembang independen (perorangan) **wajib membayar penuh $99/tahun**.

---

## 2. Kepatuhan Regulasi Apple & Google (Anti-Rejection Policy)

Agar aplikasi tidak **ditolak (*rejected*)** atau akun developer tidak di-*banned* oleh Apple Review Team:

### A. Aturan Ketat Apple App Store (Guideline 3.1.1 & 3.2.2)
- **Larangan di Aplikasi Native iOS**:
  - Apple melarang keras aplikasi perseorangan mengumpulkan donasi atau menampilkan alamat dompet crypto (Bitcoin, USDT, dll.) langsung di dalam binary iOS.
  - Apple menganggap donasi tanpa sistem *In-App Purchase* (IAP) sebagai pelanggaran pemotongan komisi 15-30%.
- **Solusi Arsitektur**:
  - **Di Aplikasi Native iOS (App Store Build)**: Bagian donasi/crypto **wajib disembunyikan** menggunakan conditional check platform:
    ```ts
    import { Capacitor } from "@capacitor/core";
    const isWeb = Capacitor.getPlatform() === "web";
    ```
  - **Di Versi Web / PWA / Website Resmi / Bio Instagram**: Apple **tidak memiliki wewenang hukum** atas apa yang Anda cantumkan di web. Anda bebas 100% memasang donasi crypto, QRIS, maupun nomor rekening.

---

## 3. Skema Pendanaan Transparan (*Milestone-Based Crowdfunding*)

Untuk menarik simpati komunitas teknologi dan calon pengguna, donasi tidak meminta dana cuma-cuma, melainkan dikemas dalam bentuk **Target Pencapaian Komunitas Transparan**:

```
[ Target 1: $25 ] ───► [ Target 2: $99 ] ───► [ Target 3: $12 ] ───► [ Target 4: $0 ]
  Google Play             Apple Developer        Domain Kustom          Biaya Server
  Console Lifetime        1 Tahun Pertama        trouvaille.app         (Supabase Free Tier)
  [Rp 400.000]            [Rp 1.600.000]         [Rp 190.000]           [Rp 0 - Selamanya]
```

### Total Dana Awal yang Dibutuhkan: **$136 USD (~Rp 2.190.000)**

### Komitmen Transparansi (*Open Ledger*):
- Setiap donasi yang masuk (TX Hash crypto atau bukti transfer) dicatat di halaman khusus/web dengan identitas donatur disamarkan (misal: `0x7a...bc91 menyumbang 10 USDT`).
- Bukti pembayaran tagihan Apple dan Google diunggah secara publik sebagai bukti integritas.

---

## 4. Kanal Pembayaran Donasi

### A. Kanal Crypto (Global & Instan)
Menggunakan stablecoin **USDT / USDC** pada jaringan dengan biaya transaksi (*gas fee*) di bawah Rp 2.000:
1. **Polygon (POL/MATIC)**: Gas fee ~Rp 300, sangat cepat, didukung seluruh exchange Indonesia (Indodax, Tokocrypto, Pintu, Binance).
2. **Arbitrum One (ETH L2)**: Gas fee ~Rp 800, standar keamanan Ethereum.
3. **Solana (SOL)**: Gas fee ~Rp 100, transaksi dalam hitungan detik.
4. **BNB Smart Chain (BEP-20)**: Gas fee ~Rp 1.500, sangat populer di Indonesia.

*Alamat Dompet Penerima (Dipersiapkan saat eksekusi):*
- EVM Address (Polygon / Arbitrum / BSC): `[MASUKKAN ALAMAT WALLET DISINI]`
- Solana Address (SOL / USDT Solana): `[MASUKKAN ALAMAT SOLANA DISINI]`

### B. Kanal Pembayaran Lokal Indonesia (QRIS / E-Wallet)
Untuk pengguna lokal yang tidak memiliki crypto:
- **Saweria / Trakteer / Lynk.id**:
  - Mendukung QRIS (GoPay, OVO, ShopeePay, DANA, BCA Mobile).
  - Pendaftaran mudah (hanya butuh email dan rekening bank/e-wallet untuk mencairkan dana).

---

## 5. Rencana Konten & Peluncuran Akun Instagram

**Nama Akun yang Disarankan**: `@trouvaille.money` atau `@trouvaille.app`  
**Bio Instagram**:
> **Trouvaille** — *Private Wealth Intelligence.*  
> No colored emojis. No clutter. No data harvesting.  
> 100% On-Device Smart Tracking & Runway Telemetry.  
> 🔗 Link: `trouvaille-web.vercel.app`

### Pilar Konten (Content Pillars):
1. **Pilar 1: The Aesthetic Contrast (Visual Reel)**
   - Perbandingan mencolok: Aplikasi keuangan biasa (banyak warna pelangi, kartun anak-anak, iklan pinjaman online) **VS** Trouvaille (Monochrome Apple Obsidian, font Urbanist, tampilan seperti instrumen kokpit pesawat jet mewah).
2. **Pilar 2: Smart Privacy & Zero-Server Philosophy**
   - Video pendek scan struk belanjaan (*Smart Receipt Scanner*).
   - Menjelaskan bahwa OCR diproses 100% di dalam chipset HP (*on-device WebAssembly*), bukan dikirim ke server pihak ketiga.
3. **Pilar 3: Building in Public & Roadmap to App Store**
   - Transparansi progres pembuatan aplikasi oleh developer independen.
   - Mengajak audiens ikut menjadi bagian dari peluncuran: *"Bantu kami kumpulkan $99 untuk bypass Apple developer fee tanpa perlu pasang iklan di dalam aplikasi."*

---

## 6. Spesifikasi Desain Komponen UI "Support Trouvaille"

Saat kita siap mengeksekusi di dalam kode aplikasi:
- **File Target**: `src/components/common/CommunityFundingModal.tsx`
- **Aesthetic**: Sesuai `GEMINI.md`:
  - Background obsidian frosted glass (`var(--bg-elevated)` dengan `1px solid var(--glass-border)`).
  - Progress bar pendanaan bergaya speedometer/linear halus dengan persentase real-time.
  - Dua Tab:
    - Tab 1: **Crypto (USDT / USDC)**: Selector jaringan (Polygon / Arbitrum / Solana), QR Code interaktif, tombol 1-tap copy address dengan haptic feedback.
    - Tab 2: **QRIS / Lokal**: Tombol direct link ke Saweria / Trakteer.
  - Alokasi dana transparan:
    - `[✓] $0 / $25 Google Play Console`
    - `[ ] $0 / $99 Apple Developer License`

---

## 7. Daftar Langkah Eksekusi (Checklist Saat Siap)

- [ ] 1. Siapkan alamat dompet crypto penerima (USDT Polygon / BSC / Solana).
- [ ] 2. Siapkan akun Saweria / Trakteer (opsional untuk dukungan QRIS lokal).
- [ ] 3. Buat komponen `CommunityFundingModal.tsx` dengan filter `isWeb` agar aman dari penolakan Apple.
- [ ] 4. Pasang tombol pemicu "Support Project" di `SettingsPage.tsx` dan landing page web.
- [ ] 5. Daftarkan akun Instagram `@trouvaille.money` / `@trouvaille.app` dan mulai mempublikasikan video demo UI.
