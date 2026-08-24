const fs = require("fs");

let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8").replace(/\r\n/g, "\n");

// Add useRef import if missing
if (!content.includes("useRef")) {
  content = content.replace('import { useState, useEffect, useMemo', 'import { useState, useEffect, useMemo, useRef');
}

const oldEffectsRegex = /\/\/ Sync state whenever transaction or isOpen changes[\s\S]*?\}, \[type, categories, wallets, categoryId, walletId, toWalletId\]\)/;

const newEffectsCode = `// Keep track of when modal opens or incoming transaction changes
  const prevOpenRef = useRef(false)
  const prevTxIdRef = useRef<string | null>(null)

  useEffect(() => {
    const isOpening = isOpen && !prevOpenRef.current
    const isTxChanged = transaction && transaction.id !== prevTxIdRef.current

    if (isOpen && (isOpening || isTxChanged)) {
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
          setCategoryId(foundCat ? foundCat.id : (categories.length > 0 ? categories[0].id : null))
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
          const toW = match?.toWallet
          const foundTo = toW ? wallets.find(w => w.name.toLowerCase() === toW.toLowerCase()) : null
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

    prevOpenRef.current = isOpen
    prevTxIdRef.current = transaction?.id || null
  }, [isOpen, transaction, categories, wallets])

  // Sync categoryId and walletId when type or list changes, WITHOUT resetting type
  useEffect(() => {
    if (type !== "transfer" && categories.length > 0) {
      const exists = categories.some(c => c.id === categoryId)
      if (!exists) {
        setCategoryId(categories[0].id)
      }
    }
    if (!walletId && wallets.length > 0) {
      setWalletId(wallets[0].id)
    }
    if (type === "transfer") {
      if (!toWalletId && wallets.length > 1) {
        const other = wallets.find(w => w.id !== walletId)
        setToWalletId(other ? other.id : wallets[1].id)
      } else if (toWalletId && toWalletId === walletId && wallets.length > 1) {
        const other = wallets.find(w => w.id !== walletId)
        if (other) setToWalletId(other.id)
      }
    }
  }, [type, categories, wallets, categoryId, walletId, toWalletId])`;

content = content.replace(oldEffectsRegex, newEffectsCode);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("Updated TransactionSheet.tsx: fixed type switching bug");
