# Trouvaille Mobile to Web Synchronization Master Report
**Dokumen Panduan Penyelarasan Arsitektur & Fitur: Trouvaille Mobile (iOS) -> Trouvaille Web Dashboard**
*Dihasilkan pada: 21 September 2026*

Dokumen ini disusun khusus sebagai **Blueprint & Panduan Komprehensif** untuk Agent AI pada sesi `trouvaille-web`. Tujuannya adalah agar proyek `trouvaille-web` dapat mengejar (*catch up*), mengadopsi seluruh logika matematika finansial mutakhir, skema database, dan fitur analitik yang telah matang di aplikasi mobile `Trouvaille`, sambil tetap mempertahankan adaptasi layout desktop/layar lebar (Bento grid, workstation view, split pane, dan command palette).

---

## 1. Ikhtisar Arsitektur & Filosofi Sistem

Trouvaille adalah sistem operasi keuangan personal (*Private Wealth Operating System*) dengan pendekatan privasi ketat (*local-first*, enkripsi sisi klien zero-knowledge) dan visual estetika **Apple Monochrome Luxury Glassmorphism**.

### Pedoman Desain Utama (STRICT):
1. **Zero Native Colored Emojis**: Dilarang keras memakai emoji berwarna sistem (📊, ⚡, 🗓️, 🎯, dll) di komponen antarmuka, card, tombol, atau navigasi. Wajib memakai ikon vektor outline dari `lucide-react` (`strokeWidth={1.5}` atau `1.75`).
2. **Monochrome Luxury Palette**:
   - Dark mode: Obsidian `#09090c` dan `#121214` dengan frosted glass border (`var(--glass-border)`) dan inner hairline glow.
   - Light mode: Alabaster smoke `#f4f4f7` / `#ffffff` dengan aksen abu arang dan charcoal transparan.
   - Tanpa aksen warna pelangi norak. Aksen hijau hanya dipakai terbatas untuk arus kas positif (`var(--accent)`).
3. **Tipografi**: Strictly `Urbanist` sans-serif dengan bobot proporsional (`font-medium`, `font-semibold`, `font-light`).
4. **Desktop Adaptation**: Di mobile menggunakan *BottomSheet*, sedangkan di Web menggunakan *Side Drawer*, *Centered Frosted Modal*, atau *Full Workstation Split-View*.

---

## 2. Pemetaan Skema Database & Entitas Supabase

Aplikasi mobile saat ini menggunakan tabel-tabel Supabase berikut:

```sql
-- Tabel Utama:
profiles (id, email, full_name, avatar_url, updated_at)
wallets (id, user_id, name, type, balance, currency, color, icon, is_archived, space_id, ledger_id)
categories (id, user_id, name, type, icon, color, budget_limit, is_system, is_archived)
transactions (id, user_id, wallet_id, to_wallet_id, category_id, type, amount, date, note, tags, receipt_url, bill_id, space_id, ledger_id)
bills (id, user_id, name, amount, category_id, wallet_id, due_date, frequency, is_active, auto_pay, last_paid_at)
goals (id, user_id, name, target_amount, current_amount, target_date, color, icon, category_id, is_completed)
spaces (id, user_id, name, description, icon, currency, is_default, created_at)
ledgers (id, user_id, space_id, name, description, is_active, created_at)
vault_entries (id, user_id, title, category, encrypted_data, iv, salt, created_at, updated_at)
```

> [!NOTE]
> Proyek web harus memastikan penanganan relasi `space_id` dan `ledger_id` pada query transaksi dan dompet agar sinkronisasi multi-buku kas berjalan transparan.

---

## 3. Komparasi Fitur & Inventaris Komponen

### A. Halaman Beranda (Home Dashboard)
Mobile memiliki sistem modular `useWidgetLayout` dengan 4 preset (`executive`, `minimal`, `tactical`, `visual`):

| Fitur / Widget | Implementasi di Mobile | Rekomendasi Adaptasi di Web |
| :--- | :--- | :--- |
| **Net Portfolio** | `NetPortfolioWidget.tsx` (Saldo bersih, toggle privasi, tren MoM) | Bento Hero Card berukuran 2 kolom di baris teratas. |
| **Portfolio Deck** | `PortfolioAccountsWidget.tsx` (Daftar rekening bank, e-wallet, cash) | 3D Wallet Deck horizontal atau Grid Card dengan status alokasi (%). |
| **Cashflow Pulse** | `CashflowPulseWidget.tsx` (Inflow vs Outflow bulanan, pacing spending) | Visual Dual-Bar atau Gauge Pacing dengan rincian burn rate harian. |
| **Spending Stability** | `SpendingStabilityWidget.tsx` (Volatilitas, daily variance, indeks) | Kartu radar metrik stabilitas (0-100) dan deviasi standar harian. |
| **AI Insights** | `AIInsightsWidget.tsx` (Anomali belanja, saran cerdas) | Executive Insight Strip interaktif dengan tombol aksi langsung. |
| **Activity Heatmap** | `SpendingHeatmapWidget.tsx` (Matriks densitas kalender transaksi) | Full Bklit Heatmap 52-pekan bergaya GitHub contribution matrix. |
| **Financial Goals** | `FinancialGoalsWidget.tsx` (Progress tabungan & milestone) | Ring Progress Cards dengan target tanggal dan sisa nominal. |
| **Upcoming Bills** | `UpcomingBillsWidget.tsx` (Tagihan & langganan 7-30 hari ke depan) | Actionable Subscription List dengan tombol quick-mark paid. |
| **Recent Ledger** | `RecentTransactionsWidget.tsx` (Feed transaksi ringkas) | Dense Data Table dengan filter instan dan pagination/virtual scroll. |
| **Top Categories** | `TopCategoriesWidget.tsx` (5 pengeluaran terbesar) | Horizontal Bar Chart dengan persentase serapan anggaran. |
| **Savings Velocity** | `SavingsVelocityWidget.tsx` (Net capital retention & runway) | Gauge Card rasio tabungan (%) dan proyeksi runway darurat (bulan). |
| **Split Bill & Receivables** | `SplitBillWidget.tsx` (Status piutang patungan tertunda) | Workstation Split View dengan daftar teman dan status settlement. |
| **Space Switcher** | `SpaceSwitcherSheet.tsx` (Ganti Personal / Bisnis / Keluarga) | Header Dropdown / Segmented Control di Top Bar navigasi web. |

---

### B. Halaman Analitik & Statistik (Deep Telemetry)
Di mobile, halaman ini terbagi dalam 4 Section (`intelligence`, `report`, `cashflow`, `assets`) dengan 4 preset (`executive`, `telemetry`, `planning`, `essential`) dan fitur **Foldable Cards (default terlipat)**:

| Fitur / Engine | Komponen Mobile Sumber | Logika & Fungsi Utama |
| :--- | :--- | :--- |
| **Timeframe & Multi-Year** | `StatisticsPage.tsx` | Filter bulan, kuartal, tahun berjalan, serta **pilihan tahun-tahun sebelumnya** untuk perbandingan historis. |
| **Financial Wrapped** | `FinancialWrappedModal.tsx` | Recap interaktif tahunan ala Spotify Wrapped, menghitung arketipe finansial, rasio tabungan, dan bulan paling hemat/boros. Mendukung pemutaran tahun sebelumnya. |
| **Health Diagnostic** | `FinancialHealthDiagnosticModal.tsx` | Diagnosa 6 pilar finansial (skor 0-100) dengan panduan peningkatan kesehatan uang. |
| **Monte Carlo Simulator** | `MonteCarloSimulatorSheet.tsx` | 10.000 simulasi probabilistik proyeksi kekayaan bersih berbasis varians pasar dan tabungan bulanan. |
| **FIRE Planner** | `FirePlannerSheet.tsx` | Kalkulator pensiun dini (LeanFIRE, FatFIRE, CoastFIRE) dengan aturan Safe Withdrawal Rate (4%). |
| **Debt Payoff Engine** | `DebtPayoffSimulatorCard.tsx` | Simulasi percepatan pelunasan utang metode Debt Snowball vs Debt Avalanche. |
| **Financial Report** | `FinancialReportSection.tsx` | Neraca Keuangan formal (Assets vs Liabilities) dan Laporan Arus Kas (Operating, Investing, Financing) berfitur lipat. |
| **Allocation Sankey** | `InteractiveSankeyChart.tsx` | Diagram aliran dana dari sumber pemasukan -> dompet -> pengeluaran & tabungan via SVG/Recharts Sankey. |
| **Net Capital Trajectory** | `StatisticsPage.tsx` | Grafik area kumulatif pertumbuhan kekayaan bersih dari waktu ke waktu (Foldable). |
| **Inflow vs Outflow Trend** | `StatisticsPage.tsx` | Grafik batang perbandingan kas masuk dan keluar per bulan (Foldable). |
| **Expense Breakdown** | `StatisticsPage.tsx` | Donut chart Recharts dengan tombol info `(i)` hemat ruang, pergeseran MoM, dan komitmen berulang. |
| **Cashflow Outlook** | `useFinancialIntelligence.ts` | Proyeksi arus kas 30-90 hari ke depan berbasis tren dan tagihan rutin. |
| **Zero-Based Envelopes** | `useFinancialIntelligence.ts` | Pembagian alokasi anggaran berbasis amplop digital (Needs, Wants, Savings). |
| **Personal Baseline** | `useFinancialIntelligence.ts` | Batas bawah biaya hidup esensial (Survival vs Comfort vs Luxury). |
| **What-If Simulator** | `useFinancialIntelligence.ts` | Simulasi dampak kenaikan gaji, pemangkasan biaya, atau cicilan baru. |

---

### C. Engine Transaksi & Input Cerdas
Mobile telah memiliki engine pengenalan dan pengolahan transaksi canggih yang berada di `src/lib/`:

1. **Multi-Transaction NLP Parser (`multiNlpParser.ts` & `nlpParser.ts`)**:
   - Mampu memproses input kalimat sehari-hari dalam Bahasa Indonesia: *"Beli bento 45k cash, bensin 50rb bca, kopi 20k"*.
   - Mewarisi konteks dompet dan tanggal secara cerdas antar anak kalimat.
2. **Receipt OCR Scanner (`ocrReceiptScanner.ts` & `ReceiptScanModal.tsx`)**:
   - Ekstraksi total pembayaran, nama toko/merchant, tanggal, dan item belanja dari foto struk belanja menggunakan Tesseract.js.
3. **Bank Statement Parser (`statementParser.ts` & `StatementImportModal.tsx`)**:
   - Mengimpor mutasi rekening PDF/CSV bank BCA, Bank Mandiri, Jenius BTPN, BNI, dan CSV generik secara otomatis.
4. **Split Bill Workstation (`useSplitBills.ts` & `SplitBillSheet.tsx`)**:
   - Pembagian tagihan dengan pajak, diskon, service charge proporsional, serta generator format teks WhatsApp.

---

### D. Keamanan, Enkripsi, & Multi-Currency
1. **Client-Side Zero-Knowledge Encrypted Vault (`vaultEncryption.ts`)**:
   - Enkripsi data rahasia menggunakan AES-256-GCM dengan salt dan IV acak via PBKDF2 (100.000 iterasi).
2. **Multi-Currency Engine (`currencyEngine.ts`)**:
   - Konversi antar mata uang (IDR, USD, EUR, SGD, JPY, GBP, dll) dengan kurs terkini dan fallback cache lokal.
3. **Asset Valuation & Depreciation (`AssetValuationSheet.tsx`, `AssetDetailSheet.tsx`)**:
   - Tracking aset bernilai tinggi dengan penghitungan depresiasi nilai buku (Straight-Line method).
4. **Luxury PDF Export (`LuxuryReportExportSheet.tsx`, `reportExportService.ts`)**:
   - Generator laporan formal PDF elegan dengan tabel, grafik, dan neraca ringkas menggunakan jsPDF.

---

## 4. Library & File Logic yang Dapat Disalin Langsung ke Web

Jika folder kode `Trouvaille` disalin atau dijadikan referensi, file-file berikut di folder `src/lib/` dan `src/hooks/` dapat digunakan langsung atau dengan modifikasi minimal:

### A. Folder `src/lib/` (Core Engines):
- `financialMath.ts`: Rumus-rumus perhitungan keuangan, runway, rasio tabungan, dan skor kesehatan.
- `monteCarloEngine.ts`: Algoritma simulasi Monte Carlo 10.000 iterasi.
- `wrappedAnalytics.ts`: Algoritma kalkulasi archetype dan metrik Financial Wrapped tahunan.
- `sankeyEngine.ts`: Transformasi data transaksi menjadi node dan link untuk Sankey Chart.
- `calendarForecasting.ts`: Logika proyeksi saldo kalender harian dan deteksi tagihan.
- `currencyEngine.ts`: Engine konversi kurs mata uang dan formatting angka.
- `multiNlpParser.ts`: Parser teks transaksi bahasa Indonesia multi-baris/kalimat.
- `statementParser.ts`: Parser mutasi rekening bank lokal.
- `vaultEncryption.ts`: Enkripsi brankas WebCrypto AES-GCM 256.
- `merchantMemory.ts`: Deteksi otomatis kategori berdasarkan histori nama merchant.
- `widgetLayoutEngine.ts` & `widgetLayoutTypes.ts`: Skema preset dan tata letak modular kartu.

### B. Folder `src/hooks/`:
- `useTransactions.ts`: CRUD transaksi, filter tanggal/kategori/dompet/space, sanitasi data.
- `useWallets.ts`: Manajemen rekening, alokasi saldo, dan kalkulasi net worth.
- `useCategories.ts`: Manajemen kategori dan batas budget per kategori.
- `useBills.ts`: Manajemen tagihan berulang dan status jatuh tempo.
- `useGoals.ts`: Manajemen target finansial dan milestone.
- `useFinancialIntelligence.ts`: Pacing budget, outlook arus kas, amplop anggaran, baseline, what-if.
- `useFinancialHealth.ts`: Diagnostik skor kesehatan finansial 6 pilar.
- `useSplitBills.ts`: Logika pembagian bon dan piutang.

---

## 5. Checklist Prioritas Penyelarasan untuk Sesi `trouvaille-web`

Bagi Agent AI di sesi `trouvaille-web`, berikut adalah langkah berurutan yang disarankan:

- [ ] **Langkah 1: Sinkronisasi Skema Database & Types**:
  Perbarui file `types/index.ts` di web agar mencakup properti `space_id`, `ledger_id`, `tags`, dan entitas baru (`spaces`, `ledgers`, `vault_entries`, `assets`).
- [ ] **Langkah 2: Salin Core Engines (`src/lib/`)**:
  Salin file mesin matematika (`financialMath.ts`, `monteCarloEngine.ts`, `wrappedAnalytics.ts`, `sankeyEngine.ts`, `currencyEngine.ts`, `multiNlpParser.ts`, `statementParser.ts`) dari apps ke web.
- [ ] **Langkah 3: Selaraskan Hooks Bisnis (`src/hooks/`)**:
  Pastikan hook di web memanfaatkan core engine tersebut agar kalkulasi angka di web dan mobile identik 100%.
- [ ] **Langkah 4: Perkaya Dashboard & Analitik Desktop**:
  - Terapkan selector timeframe multi-tahun pada halaman statistik.
  - Implementasikan modal/halaman **Financial Wrapped** dengan dukungan tahun sebelumnya.
  - Tambahkan kartu **Monte Carlo Simulator**, **FIRE Planner**, **Debt Payoff Engine**, dan **Financial Report**.
  - Terapkan **Interactive Sankey Chart** pada bagian Cashflow.
  - Pastikan kartu-kartu berdimensi panjang memiliki opsi lipat (*foldable*) agar tampilan desktop tetap bersih dan teratur.
- [ ] **Langkah 5: Audit Kepatuhan Desain (GEMINI.md)**:
  Pastikan tidak ada emoji berwarna sistem di UI web, semua ikon menggunakan `lucide-react`, dan estetika *Monochrome Apple Luxury* terjaga secara konsisten.
