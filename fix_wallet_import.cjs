const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");

content = content.replace(
  'import { Search, X, ArrowLeftRight, Calendar, Clock, ChevronDown, Archive } from "lucide-react"',
  'import { Search, X, ArrowLeftRight, Calendar, Clock, ChevronDown, Archive, Wallet } from "lucide-react"'
);

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Added Wallet import to TransactionsPage.tsx");
