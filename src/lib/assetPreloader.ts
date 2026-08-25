export const ALL_APP_ICONS = [
  "/icons/admin.png",
  "/icons/Asuransi.png",
  "/icons/bensin.png",
  "/icons/Bonus.png",
  "/icons/bunga.png",
  "/icons/cafe.png",
  "/icons/Cashback.png",
  "/icons/donasi.png",
  "/icons/Elektronik.png",
  "/icons/fashion.png",
  "/icons/Furnitur.png",
  "/icons/gadget.png",
  "/icons/gaji.png",
  "/icons/Groceries.png",
  "/icons/hadiah.png",
  "/icons/hiburan.png",
  "/icons/hilang.png",
  "/icons/hunian.png",
  "/icons/internet.png",
  "/icons/investasi.png",
  "/icons/jasa.png",
  "/icons/Karir.png",
  "/icons/Keluarga.png",
  "/icons/kendaraan.png",
  "/icons/kerugian.png",
  "/icons/kesehatan.png",
  "/icons/Komisi.png",
  "/icons/kopi.png",
  "/icons/lainnya.png",
  "/icons/laundry.png",
  "/icons/liburan.png",
  "/icons/makanan.png",
  "/icons/minuman.png",
  "/icons/olahraga.png",
  "/icons/pajak-legal.png",
  "/icons/parkir.png",
  "/icons/pemberian.png",
  "/icons/pendidikan.png",
  "/icons/Penjualan.png",
  "/icons/Peralatan.png",
  "/icons/perawatan.png",
  "/icons/Pets.png",
  "/icons/Refund.png",
  "/icons/Reparasi.png",
  "/icons/Saku.png",
  "/icons/side job.png",
  "/icons/subscription.png",
  "/icons/trading.png",
  "/icons/transportasi.png",
  "/icons/wallet.png",
  "/icons/Zakat.png",
  "/icons/Budgets/BCA.png",
  "/icons/Budgets/BLU.png",
  "/icons/Budgets/BNI.png",
  "/icons/Budgets/BRI.png",
  "/icons/Budgets/Cash.png",
  "/icons/Budgets/Crypto.png",
  "/icons/Budgets/Dana.png",
  "/icons/Budgets/Gopay.png",
  "/icons/Budgets/Jago.png",
  "/icons/Budgets/Krom.png",
  "/icons/Budgets/Liabilities.png",
  "/icons/Budgets/Link.png",
  "/icons/Budgets/Mandiri.png",
  "/icons/Budgets/Ovo.png",
  "/icons/Budgets/Piutang.png",
  "/icons/Budgets/Saham.png",
  "/icons/Budgets/Seabank.png",
  "/icons/Budgets/Shopeepay.png",
  "/icons/Budgets/Superbank.png",
  "/icons/Budgets/Tapcash.png"
]

const preloadedCache = new Map<string, HTMLImageElement>()

export function preloadAllIcons(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()

  const promises = ALL_APP_ICONS.map(src => {
    if (preloadedCache.has(src)) return Promise.resolve()

    return new Promise<void>(resolve => {
      const img = new Image()
      img.onload = () => {
        preloadedCache.set(src, img)
        resolve()
      }
      img.onerror = () => {
        resolve()
      }
      img.src = src
    })
  })

  return Promise.all(promises).then(() => {})
}
