import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Wallet,
  Landmark,
  CreditCard,
  Coins,
  Banknote,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Receipt,
  Scale,
  HandCoins,
  BadgePercent,
  Percent,
  ShieldCheck,
  DollarSign,
  Vault,
  CandlestickChart,
  CircleDollarSign,
  ArrowRightLeft,
  RotateCcw,
  Globe,
  Utensils,
  UtensilsCrossed,
  Coffee,
  CupSoda,
  Pizza,
  Apple,
  Wine,
  Cake,
  ShoppingBag,
  Beer,
  Soup,
  ChefHat,
  Cookie,
  Car,
  Fuel,
  Bus,
  Plane,
  Bike,
  Train,
  Navigation,
  ParkingCircle,
  Compass,
  MapPin,
  Ship,
  Luggage,
  Home,
  Building2,
  Bed,
  Wrench,
  Key,
  Hammer,
  Lightbulb,
  Bath,
  Armchair,
  Plug,
  DoorClosed,
  PaintBucket,
  ShoppingCart,
  Tag,
  Gift,
  Sparkles,
  Watch,
  Shirt,
  Gem,
  Glasses,
  Scissors,
  Footprints,
  Package,
  Trophy,
  Smartphone,
  Laptop,
  Wifi,
  Tv,
  Headphones,
  Camera,
  Gamepad2,
  Film,
  Music,
  Radio,
  Monitor,
  Speaker,
  HeartPulse,
  Dumbbell,
  Activity,
  Pill,
  Stethoscope,
  Trees,
  Smile,
  Baby,
  Syringe,
  Cross,
  Briefcase,
  GraduationCap,
  BookOpen,
  Award,
  PenTool,
  FileText,
  Library,
  Calendar,
  Paperclip,
  Calculator,
  Users,
  User,
  Heart,
  HeartHandshake,
  Dog,
  Cat,
  MessageCircle,
  PartyPopper,
  Store,
} from "lucide-react";

export type IconComponent = ComponentType<LucideProps>;

// ─── 1. Complete Lucide Component Lookup ─────────────────────────────────────
export const ALL_ICONS_MAP: Record<string, IconComponent> = {
  // Finance & Banking
  Wallet,
  Landmark,
  CreditCard,
  Coins,
  Banknote,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Receipt,
  Scale,
  HandCoins,
  BadgePercent,
  Percent,
  ShieldCheck,
  DollarSign,
  Vault,
  CandlestickChart,
  CircleDollarSign,
  ArrowRightLeft,
  RotateCcw,
  Globe,

  // Food & Dining
  Utensils,
  UtensilsCrossed,
  Coffee,
  CupSoda,
  Pizza,
  Apple,
  Wine,
  Cake,
  ShoppingBag,
  Beer,
  Soup,
  ChefHat,
  Cookie,

  // Transportation & Travel
  Car,
  Fuel,
  Bus,
  Plane,
  Bike,
  Train,
  Navigation,
  ParkingCircle,
  Compass,
  MapPin,
  Ship,
  Luggage,

  // Living & Property
  Home,
  Building2,
  Bed,
  Wrench,
  Key,
  Hammer,
  Lightbulb,
  Bath,
  Armchair,
  Plug,
  DoorClosed,
  PaintBucket,

  // Shopping & Personal
  ShoppingCart,
  Tag,
  Gift,
  Sparkles,
  Watch,
  Shirt,
  Gem,
  Glasses,
  Scissors,
  Footprints,
  Package,
  Trophy,

  // Tech & Media
  Smartphone,
  Laptop,
  Wifi,
  Tv,
  Headphones,
  Camera,
  Gamepad2,
  Film,
  Music,
  Radio,
  Monitor,
  Speaker,

  // Health & Lifestyle
  HeartPulse,
  Dumbbell,
  Activity,
  Pill,
  Stethoscope,
  Trees,
  Smile,
  Baby,
  Syringe,
  Cross,

  // Work & Education
  Briefcase,
  GraduationCap,
  BookOpen,
  Award,
  PenTool,
  FileText,
  Library,
  Calendar,
  Paperclip,
  Calculator,

  // Family & Social
  Users,
  User,
  Heart,
  HeartHandshake,
  Dog,
  Cat,
  MessageCircle,
  PartyPopper,
  Store,
};

// Case-insensitive lookup map for fast normalized access
const NORMALIZED_ICONS_MAP: Record<string, IconComponent> = {};
for (const [name, comp] of Object.entries(ALL_ICONS_MAP)) {
  NORMALIZED_ICONS_MAP[name.toLowerCase()] = comp;
}

// ─── 2. Curated Icon Categories for the Icon Picker ─────────────────────────
export interface IconGroup {
  id: string;
  label: string;
  icons: string[];
}

export const CURATED_ICON_GROUPS: IconGroup[] = [
  {
    id: "finance",
    label: "Finance",
    icons: [
      "Wallet",
      "Landmark",
      "CreditCard",
      "Coins",
      "Banknote",
      "PiggyBank",
      "TrendingUp",
      "TrendingDown",
      "Receipt",
      "Scale",
      "HandCoins",
      "BadgePercent",
      "Percent",
      "ShieldCheck",
      "DollarSign",
      "Vault",
      "CandlestickChart",
      "CircleDollarSign",
      "RotateCcw",
      "ArrowRightLeft",
      "Globe",
    ],
  },
  {
    id: "food",
    label: "Food & Drinks",
    icons: [
      "Utensils",
      "UtensilsCrossed",
      "Coffee",
      "CupSoda",
      "Pizza",
      "Apple",
      "Wine",
      "Cake",
      "ShoppingBag",
      "Beer",
      "Soup",
      "ChefHat",
      "Cookie",
    ],
  },
  {
    id: "transport",
    label: "Transport",
    icons: [
      "Car",
      "Fuel",
      "Bus",
      "Plane",
      "Bike",
      "Train",
      "Navigation",
      "ParkingCircle",
      "Compass",
      "MapPin",
      "Ship",
      "Luggage",
    ],
  },
  {
    id: "living",
    label: "Living & Housing",
    icons: [
      "Home",
      "Building2",
      "Bed",
      "Wrench",
      "Key",
      "Hammer",
      "Lightbulb",
      "Bath",
      "Armchair",
      "Plug",
      "DoorClosed",
      "PaintBucket",
    ],
  },
  {
    id: "shopping",
    label: "Shopping & Style",
    icons: [
      "ShoppingCart",
      "Tag",
      "Gift",
      "Sparkles",
      "Watch",
      "Shirt",
      "Gem",
      "Glasses",
      "Scissors",
      "Footprints",
      "Package",
      "Trophy",
    ],
  },
  {
    id: "tech",
    label: "Tech & Media",
    icons: [
      "Smartphone",
      "Laptop",
      "Wifi",
      "Tv",
      "Headphones",
      "Camera",
      "Gamepad2",
      "Film",
      "Music",
      "Radio",
      "Monitor",
      "Speaker",
    ],
  },
  {
    id: "health",
    label: "Health & Fitness",
    icons: [
      "HeartPulse",
      "Dumbbell",
      "Activity",
      "Pill",
      "Stethoscope",
      "Trees",
      "Smile",
      "Baby",
      "Syringe",
      "Cross",
    ],
  },
  {
    id: "work",
    label: "Work & Education",
    icons: [
      "Briefcase",
      "GraduationCap",
      "BookOpen",
      "Award",
      "PenTool",
      "FileText",
      "Library",
      "Calendar",
      "Paperclip",
      "Calculator",
    ],
  },
  {
    id: "family",
    label: "Social & Lifestyle",
    icons: [
      "Users",
      "User",
      "Heart",
      "HeartHandshake",
      "Dog",
      "Cat",
      "MessageCircle",
      "PartyPopper",
      "Store",
    ],
  },
];

// Flat list of unique curated icons
export const ALL_CURATED_ICON_NAMES: string[] = Array.from(
  new Set(CURATED_ICON_GROUPS.flatMap((g) => g.icons)),
);

// ─── 3. Rich Bilingual Search Keywords (ID / EN) ─────────────────────────────
export const ICON_KEYWORDS: Record<string, string[]> = {
  Wallet: ["dompet", "wallet", "uang", "money", "pocket", "cash", "saldo"],
  Landmark: ["bank", "bca", "bri", "mandiri", "bni", "cimb", "jago", "blu", "seabank", "krom", "atm", "gedung", "monument"],
  CreditCard: ["kartu", "kredit", "debit", "visa", "mastercard", "card", "paylater", "tapcash"],
  Coins: ["koin", "crypto", "usdt", "btc", "uang", "receh", "saku", "crypto"],
  Banknote: ["tunai", "cash", "rupiah", "uang", "kertas", "dollar", "bill"],
  PiggyBank: ["celengan", "tabungan", "saving", "nabung", "simpanan", "invest"],
  TrendingUp: ["saham", "investasi", "profit", "cuan", "gain", "karir", "growth", "naik"],
  TrendingDown: ["kerugian", "loss", "rugi", "turun", "drop"],
  Receipt: ["struk", "nota", "tagihan", "bill", "invoice", "admin", "pajak"],
  Scale: ["hukum", "legal", "adil", "liabilitas", "hutang", "pinjaman", "tax"],
  HandCoins: ["piutang", "pinjaman", "utang", "lend", "borrow", "talangan", "kasbon", "bayar utang", "bayar hutang"],
  BadgePercent: ["komisi", "fee", "diskon", "discount", "promo", "persen"],
  Percent: ["bunga", "cashback", "interest", "diskon", "percent"],
  ShieldCheck: ["asuransi", "insurance", "aman", "security", "protect", "garansi"],
  DollarSign: ["dollar", "usd", "valas", "kurs", "mata uang"],
  Vault: ["brankas", "safe", "deposito", "secure", "emas"],
  CandlestickChart: ["trading", "forex", "crypto", "chart", "grafik", "saham"],
  CircleDollarSign: ["uang", "koin", "dollar", "keuangan", "finansial"],
  RotateCcw: ["refund", "pengembalian", "retur", "kembali", "putar"],
  Globe: ["wise", "revolut", "global", "dunia", "international", "valas", "kurs", "forex", "borderless", "world", "foreign"],

  Utensils: ["makan", "makanan", "food", "resto", "dinner", "lunch", "sarapan", "kuliner"],
  UtensilsCrossed: ["restoran", "cafe", "makan", "dining", "chef"],
  Coffee: ["kopi", "ngopi", "coffee", "cafe", "nongkrong", "starbucks", "espresso", "latte"],
  CupSoda: ["minuman", "drink", "boba", "jus", "soda", "tea", "teh"],
  Pizza: ["pizza", "snack", "fast food", "junk food", "cemilan"],
  Apple: ["buah", "fruit", "apel", "sehat", "healthy", "diet"],
  Wine: ["alkohol", "wine", "bar", "cocktail", "party", "minum"],
  Cake: ["kue", "cake", "ulang tahun", "birthday", "dessert", "roti", "bakery"],
  ShoppingBag: ["belanja", "groceries", "supermarket", "minimarket", "pasar", "sembako"],
  Beer: ["beer", "bir", "nongkrong"],
  Soup: ["sup", "mie", "ramen", "bakso", "soto", "makan"],
  ChefHat: ["masak", "cooking", "resep", "dapur"],
  Cookie: ["biskuit", "kue", "cemilan", "snack"],

  Car: ["mobil", "kendaraan", "car", "taksi", "grab", "gojek", "gocar"],
  Fuel: ["bensin", "pertamax", "pertalite", "bbm", "gas", "fuel", "spbu"],
  Bus: ["bus", "bis", "transjakarta", "angkot", "shuttle"],
  Plane: ["pesawat", "liburan", "flight", "travel", "tiket", "vacation", "trip"],
  Bike: ["motor", "sepeda", "bike", "ojol", "goride", "kendaraan"],
  Train: ["kereta", "krl", "mrt", "lrt", "commuter", "train"],
  Navigation: ["navigasi", "maps", "arah", "gps", "jalan"],
  ParkingCircle: ["parkir", "parking", "karcis", "biaya parkir"],
  Compass: ["kompas", "adventure", "wisata", "jelajah"],
  MapPin: ["lokasi", "tempat", "destination", "tujuan"],
  Ship: ["kapal", "ferry", "laut", "boat"],
  Luggage: ["koper", "bagasi", "travel", "trip", "tour"],

  Home: ["rumah", "hunian", "home", "house", "villa", "kost", "kontrakan", "sewa"],
  Building2: ["apartemen", "kantor", "apartment", "building", "properti", "gedung"],
  Bed: ["kasur", "hotel", "istirahat", "kost", "furniture", "kamar"],
  Wrench: ["peralatan", "alat", "tools", "perbaikan", "service", "maintenance"],
  Key: ["kunci", "akses", "sewa", "rent", "property"],
  Hammer: ["reparasi", "renovasi", "pertukangan", "bengkel", "rebuild"],
  Lightbulb: ["listrik", "pln", "lampu", "tagihan", "ide"],
  Bath: ["kamar mandi", "toilet", "sabun", "kebersihan"],
  Armchair: ["furnitur", "sofa", "kursi", "ruang tamu", "interior"],
  Plug: ["elektronik", "colokan", "daya", "cas"],
  DoorClosed: ["pintu", "privasi", "ruangan"],
  PaintBucket: ["cat", "renovasi", "dekorasi", "interior"],

  ShoppingCart: ["belanja", "toko", "cart", "ecommerce", "olshop"],
  Tag: ["kategori", "label", "tag", "lainnya", "other", "promo"],
  Gift: ["hadiah", "kado", "gift", "bonus", "pemberian", "hampers"],
  Sparkles: ["perawatan", "skincare", "beauty", "salon", "glow", "estetika"],
  Watch: ["jam", "jam tangan", "watch", "aksesoris", "luxury"],
  Shirt: ["pakaian", "baju", "fashion", "celana", "laundry", "outfit"],
  Gem: ["perhiasan", "emas", "diamond", "jewelry", "berlian", "mewah"],
  Glasses: ["kacamata", "optik", "mata", "aksesoris"],
  Scissors: ["potong rambut", "barbershop", "jahit", "salon"],
  Footprints: ["sepatu", "sandal", "footwear", "jalan"],
  Package: ["paket", "kurir", "ongkir", "delivery", "jne", "jnt"],
  Trophy: ["prestasi", "piala", "reward", "juara", "hadiah"],

  Smartphone: ["hp", "gadget", "pulsa", "dana", "gopay", "ovo", "telepon", "handphone", "paypal"],
  Laptop: ["komputer", "laptop", "pc", "elektronik", "kerja", "device"],
  Wifi: ["internet", "wifi", "kuota", "provider", "indihome", "biznet"],
  Tv: ["tv", "televisi", "netflix", "streaming", "hiburan", "film"],
  Headphones: ["headset", "earphone", "musik", "audio", "spotify"],
  Camera: ["kamera", "foto", "photography", "video"],
  Gamepad2: ["game", "gaming", "steam", "playstation", "hiburan", "top up"],
  Film: ["bioskop", "cinema", "film", "movie", "tiket"],
  Music: ["musik", "konser", "song", "audio"],
  Radio: ["radio", "siaran", "podcast"],
  Monitor: ["layar", "monitor", "display", "setup"],
  Speaker: ["speaker", "audio", "sound"],

  HeartPulse: ["kesehatan", "dokter", "obat", "rumah sakit", "medis", "clinic"],
  Dumbbell: ["olahraga", "gym", "fitness", "workout", "sehat"],
  Activity: ["aktivitas", "detak jantung", "kebugaran", "tracking"],
  Pill: ["obat", "vitamin", "farmasi", "apotek", "suplemen"],
  Stethoscope: ["dokter", "pemeriksaan", "checkup", "klinik"],
  Trees: ["taman", "alam", "nature", "outdoor", "lingkungan"],
  Smile: ["kebahagiaan", "rekreasi", "fun", "senang"],
  Baby: ["bayi", "anak", "popok", "susu", "kids"],
  Syringe: ["vaksin", "suntik", "imunisasi", "laboratorium"],
  Cross: ["palang merah", "darurat", "pertolongan", "hospital"],

  Briefcase: ["gaji", "pekerjaan", "karir", "side job", "bisnis", "kantor", "job"],
  GraduationCap: ["pendidikan", "kuliah", "sekolah", "kursus", "spp", "edukasi"],
  BookOpen: ["buku", "belajar", "reading", "perpustakaan", "novel"],
  Award: ["penghargaan", "sertifikat", "prestasi", "bonus"],
  PenTool: ["desain", "kreatif", "freelance", "art"],
  FileText: ["dokumen", "laporan", "administrasi", "kontrak", "berkas"],
  Library: ["perpustakaan", "kampus", "literasi"],
  Calendar: ["jadwal", "tanggal", "event", "agenda"],
  Paperclip: ["lampiran", "berkas", "alat tulis", "kantor"],
  Calculator: ["hitung", "akuntansi", "kalkulator", "pajak"],

  Users: ["keluarga", "family", "teman", "komunitas", "grup"],
  User: ["pribadi", "personal", "profil", "diri"],
  Heart: ["cinta", "pasangan", "kasih", "sayang", "favorit"],
  HeartHandshake: ["donasi", "zakat", "amal", "sedekah", "bantuan", "sosial"],
  Dog: ["anjing", "pet", "hewan", "veterinarian"],
  Cat: ["kucing", "pet", "hewan peliharaan", "cat food"],
  MessageCircle: ["chat", "pesan", "komunikasi", "whatsapp"],
  PartyPopper: ["pesta", "celebration", "perayaan", "selamat"],
  Store: ["toko", "penjualan", "warung", "usaha", "bisnis"],
};

// ─── 4. Full Legacy 3D PNG Mapper (100% Coverage) ───────────────────────────
// Any legacy string matching these keys will automatically resolve to a Lucide icon
export const LEGACY_PNG_ICON_MAP: Record<string, string> = {
  // Expense/Income PNGs
  "001.png": "Tag",
  "002.png": "Tag",
  "asuransi.png": "ShieldCheck",
  "bonus.png": "Gift",
  "cashback.png": "Percent",
  "elektronik.png": "Tv",
  "furnitur.png": "Armchair",
  "groceries.png": "ShoppingBag",
  "karir.png": "TrendingUp",
  "keluarga.png": "Users",
  "komisi.png": "BadgePercent",
  "penjualan.png": "Store",
  "peralatan.png": "Wrench",
  "pets.png": "Dog",
  "refund.png": "RotateCcw",
  "reparasi.png": "Hammer",
  "saku.png": "Coins",
  "zakat.png": "HeartHandshake",
  "admin.png": "Receipt",
  "bensin.png": "Fuel",
  "bunga.png": "Percent",
  "cafe.png": "Coffee",
  "donasi.png": "HeartHandshake",
  "fashion.png": "Shirt",
  "gadget.png": "Smartphone",
  "gaji.png": "Briefcase",
  "hadiah.png": "Trophy",
  "hiburan.png": "Gamepad2",
  "hunian.png": "Home",
  "internet.png": "Wifi",
  "investasi.png": "TrendingUp",
  "jasa.png": "Briefcase",
  "kendaraan.png": "Car",
  "kerugian.png": "TrendingDown",
  "kesehatan.png": "HeartPulse",
  "kopi.png": "Coffee",
  "lainnya.png": "Tag",
  "laundry.png": "Shirt",
  "liburan.png": "Plane",
  "makanan.png": "Utensils",
  "minuman.png": "CupSoda",
  "olahraga.png": "Dumbbell",
  "pajak-legal.png": "Scale",
  "parkir.png": "ParkingCircle",
  "pemberian.png": "Gift",
  "pendidikan.png": "GraduationCap",
  "perawatan.png": "Sparkles",
  "side job.png": "Briefcase",
  "subscription.png": "CreditCard",
  "trading.png": "CandlestickChart",
  "transportasi.png": "Car",
  "wallet.png": "Wallet",

  // Budgets / Account PNGs
  "bca.png": "Landmark",
  "blu.png": "Landmark",
  "bni.png": "Landmark",
  "bri.png": "Landmark",
  "mandiri.png": "Landmark",
  "jago.png": "Landmark",
  "krom.png": "Landmark",
  "seabank.png": "Landmark",
  "superbank.png": "Landmark",
  "cash.png": "Banknote",
  "crypto.png": "Coins",
  "dana.png": "Smartphone",
  "gopay.png": "Smartphone",
  "ovo.png": "Smartphone",
  "link.png": "Smartphone",
  "linkaja.png": "Smartphone",
  "shopeepay.png": "Smartphone",
  "shopee.png": "Smartphone",
  "tapcash.png": "CreditCard",
  "liabilities.png": "Scale",
  "piutang.png": "HandCoins",
  "saham.png": "TrendingUp",
  "custom.png": "Wallet",
  "makan.png": "Utensils",
  "transport.png": "Car",
  "tagihan.png": "Receipt",
  "transfer.png": "ArrowRightLeft",
};

// Common emoji to Lucide icon fallback
export const EMOJI_TO_LUCIDE_MAP: Record<string, string> = {
  "🍔": "Utensils",
  "🍜": "Utensils",
  "🍕": "Pizza",
  "☕": "Coffee",
  "🥤": "CupSoda",
  "🚗": "Car",
  "🚘": "Car",
  "🛵": "Bike",
  "⛽": "Fuel",
  "🏠": "Home",
  "🏡": "Home",
  "🏢": "Building2",
  "💰": "Banknote",
  "💵": "Banknote",
  "💳": "CreditCard",
  "🪙": "Coins",
  "🛒": "ShoppingCart",
  "🛍️": "ShoppingBag",
  "👕": "Shirt",
  "💼": "Briefcase",
  "✈️": "Plane",
  "🩺": "HeartPulse",
  "💊": "Pill",
  "📱": "Smartphone",
  "💻": "Laptop",
  "🏋️": "Dumbbell",
  "⚽": "Activity",
  "🎓": "GraduationCap",
  "📚": "BookOpen",
  "🎁": "Gift",
  "🏆": "Trophy",
  "🐶": "Dog",
  "🐱": "Cat",
  "🎮": "Gamepad2",
  "📺": "Tv",
  "🎧": "Headphones",
  "🎬": "Film",
  "📈": "TrendingUp",
  "📉": "TrendingDown",
  "🧾": "Receipt",
  "⚖️": "Scale",
  "✨": "Sparkles",
};

// ─── 5. Universal Vector Icon Resolver ───────────────────────────────────────
/**
 * Resolves any icon string (Lucide name, legacy PNG path, or emoji) into a Lucide icon component.
 * Guaranteed to never crash and always return a valid React SVG component.
 */
export function resolveIconComponent(icon?: string | null): IconComponent {
  if (!icon || typeof icon !== "string") {
    return Tag;
  }

  const trimmed = icon.trim();

  // A. Direct PascalCase Lucide icon match
  if (ALL_ICONS_MAP[trimmed]) {
    return ALL_ICONS_MAP[trimmed];
  }

  // B. Case-insensitive Lucide icon match
  const lower = trimmed.toLowerCase();
  if (NORMALIZED_ICONS_MAP[lower]) {
    return NORMALIZED_ICONS_MAP[lower];
  }

  // C. Emoji mapping
  if (EMOJI_TO_LUCIDE_MAP[trimmed]) {
    const lucideName = EMOJI_TO_LUCIDE_MAP[trimmed];
    if (ALL_ICONS_MAP[lucideName]) return ALL_ICONS_MAP[lucideName];
  }

  // D. Legacy PNG file paths (e.g. "/icons/makanan.png", "Budgets/BCA.png", "kopi.png")
  let normalizedFile = lower;
  if (normalizedFile.includes("/")) {
    const parts = normalizedFile.split("/");
    normalizedFile = parts[parts.length - 1]; // get filename
  }
  // Strip extensions
  const cleanName = normalizedFile.replace(/\.(png|webp|jpg|jpeg|svg)$/i, "");

  // Match in legacy map with or without extension
  if (LEGACY_PNG_ICON_MAP[normalizedFile]) {
    const targetName = LEGACY_PNG_ICON_MAP[normalizedFile];
    if (ALL_ICONS_MAP[targetName]) return ALL_ICONS_MAP[targetName];
  }

  if (LEGACY_PNG_ICON_MAP[cleanName + ".png"]) {
    const targetName = LEGACY_PNG_ICON_MAP[cleanName + ".png"];
    if (ALL_ICONS_MAP[targetName]) return ALL_ICONS_MAP[targetName];
  }

  // E. Direct name matching on clean filename (e.g. "wallet" -> Wallet)
  if (NORMALIZED_ICONS_MAP[cleanName]) {
    return NORMALIZED_ICONS_MAP[cleanName];
  }

  // Default fallback
  return Tag;
}

// ─── 6. Intelligent Icon Auto-Suggester ───────────────────────────────────────
/**
 * Automatically suggests a vector icon name based on text input (e.g. "kopi" -> "Coffee").
 */
export function autoSuggestIcon(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const q = text.trim().toLowerCase();
  if (!q) return null;

  // Direct normalized match
  if (NORMALIZED_ICONS_MAP[q]) {
    for (const [name, _] of Object.entries(ALL_ICONS_MAP)) {
      if (name.toLowerCase() === q) return name;
    }
  }

  // Check legacy map
  if (LEGACY_PNG_ICON_MAP[q + ".png"]) {
    return LEGACY_PNG_ICON_MAP[q + ".png"];
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  // 1. Exact full query match on keyword
  for (const [iconName, keywords] of Object.entries(ICON_KEYWORDS)) {
    for (const kw of keywords) {
      if (q === kw) return iconName;
    }
  }

  // 2. Exact word token match (e.g. "bca" in "bca tabungan", "gym" in "bayar gym")
  for (const token of tokens) {
    for (const [iconName, keywords] of Object.entries(ICON_KEYWORDS)) {
      for (const kw of keywords) {
        if (token === kw) return iconName;
      }
    }
  }

  // 3. Substring match
  for (const [iconName, keywords] of Object.entries(ICON_KEYWORDS)) {
    for (const kw of keywords) {
      if (q.includes(kw) || kw.includes(q)) {
        return iconName;
      }
    }
  }

  return null;
}
