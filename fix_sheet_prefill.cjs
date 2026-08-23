const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

// Add import of getFamfinaMatch
if (!content.includes("getFamfinaMatch")) {
  content = 'import { getFamfinaMatch } from "../../lib/famfinaResolver"\n' + content;
}

// Replace the sync state useEffect
const oldEffectRegex = /useEffect\(\(\) => \{\s*if \(isOpen\) \{\s*setIsSaving\(false\)[\s\S]*?setToWalletId\(wallets\.length > 1 \? wallets\[1\]\.id : null\)\s*\}\s*\}\s*\}, \[transaction, isOpen\]\)/;

const newEffect = `useEffect(() => {
    if (isOpen) {
      setIsSaving(false)
      if (transaction) {
        setType(transaction.type)
        setAmount(String(transaction.amount || "0"))
        setNote(transaction.note || "")
        setDate(transaction.occurred_on ? new Date(transaction.occurred_on) : new Date())
        setTime(transaction.created_at ? format(new Date(transaction.created_at), "HH:mm") : format(new Date(), "HH:mm"))

        const match = getFamfinaMatch(transaction)

        // 1. Resolve Category
        if (transaction.category_id) {
          setCategoryId(transaction.category_id)
        } else if (match?.categoryName) {
          const foundCat = categories.find(c => c.name.toLowerCase() === match.categoryName.toLowerCase())
          setCategoryId(foundCat ? foundCat.id : null)
        } else {
          setCategoryId(categories.length > 0 ? categories[0].id : null)
        }

        // 2. Resolve Wallet (From Account)
        if (transaction.wallet_id) {
          setWalletId(transaction.wallet_id)
        } else if (match?.fromWallet) {
          const foundWallet = wallets.find(w => w.name.toLowerCase() === match.fromWallet.toLowerCase())
          setWalletId(foundWallet ? foundWallet.id : (wallets.length > 0 ? wallets[0].id : null))
        } else {
          setWalletId(wallets.length > 0 ? wallets[0].id : null)
        }

        // 3. Resolve To Wallet (Transfer)
        if (transaction.to_wallet_id) {
          setToWalletId(transaction.to_wallet_id)
        } else if (match?.toWallet) {
          const foundTo = wallets.find(w => w.name.toLowerCase() === match.toWallet.toLowerCase())
          setToWalletId(foundTo ? foundTo.id : (wallets.length > 1 ? wallets[1].id : null))
        } else {
          setToWalletId(wallets.length > 1 ? wallets[1].id : null)
        }
      } else {
        setType("expense")
        setAmount("0")
        setNote("")
        setDate(new Date())
        setTime(format(new Date(), "HH:mm"))
        setCategoryId(categories.length > 0 ? categories[0].id : null)
        setWalletId(wallets.length > 0 ? wallets[0].id : null)
        setToWalletId(wallets.length > 1 ? wallets[1].id : null)
      }
    }
  }, [transaction, isOpen, categories, wallets])`;

content = content.replace(oldEffectRegex, newEffect);

// In handleSave, ensure UUID safety so Postgres never rejects fallback IDs
const isValidUUIDFn = `const isUUID = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)\n`;
if (!content.includes("const isUUID =")) {
  content = content.replace('const handleSave = () => {', 'const handleSave = () => {\n    ' + isValidUUIDFn);
}

// Sanitize payload in handleSave
const oldPayloadRegex = /const payload = \{[\s\S]*?to_wallet_id:[^\n]*\n\s*\}/;
const newPayload = `const payload = {
      type,
      amount: numAmount,
      note,
      occurred_on: format(date, "yyyy-MM-dd"),
      created_at: txDate.toISOString(),
      category_id: type === "transfer" ? null : (isUUID(effectiveCatId) ? effectiveCatId : null),
      wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
      to_wallet_id: type === "transfer" && isUUID(effectiveToWalletId) ? effectiveToWalletId : null
    }`;
content = content.replace(oldPayloadRegex, newPayload);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("TransactionSheet updated with Famfina prefill and UUID safety");
