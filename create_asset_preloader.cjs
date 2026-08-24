const fs = require("fs");

const preloaderCode = `export const ALL_APP_ICONS = [
  "/icons/admin.png",
  "/icons/bensin.png",
  "/icons/bunga.png",
  "/icons/cafe.png",
  "/icons/donasi.png",
  "/icons/fashion.png",
  "/icons/gadget.png",
  "/icons/gaji.png",
  "/icons/hadiah.png",
  "/icons/hiburan.png",
  "/icons/hilang.png",
  "/icons/hunian.png",
  "/icons/internet.png",
  "/icons/investasi.png",
  "/icons/jasa.png",
  "/icons/kendaraan.png",
  "/icons/kesehatan.png",
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
  "/icons/perawatan.png",
  "/icons/side job.png",
  "/icons/subscription.png",
  "/icons/trading.png",
  "/icons/transportasi.png",
  "/icons/wallet.png",
  "/icons/Budgets/BLU.png",
  "/icons/Budgets/BNI.png",
  "/icons/Budgets/Cash.png",
  "/icons/Budgets/Crypto.png",
  "/icons/Budgets/Dana.png",
  "/icons/Budgets/Gopay.png",
  "/icons/Budgets/Jago.png",
  "/icons/Budgets/Krom.png",
  "/icons/Budgets/Liabilities.png",
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
`;

fs.writeFileSync("src/lib/assetPreloader.ts", preloaderCode, "utf8");
console.log("Created src/lib/assetPreloader.ts");
