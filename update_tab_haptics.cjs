const fs = require("fs");
let content = fs.readFileSync("src/components/layout/BottomTabBar.tsx", "utf8");

content = 'import { triggerHaptic } from "../../lib/haptics"\n' + content;

content = content.replace(
  'onClick={onOpenAdd}',
  'onClick={() => { triggerHaptic("medium"); if (onOpenAdd) onOpenAdd(); }}'
);

content = content.replace(
  'className="w-10 h-10 flex items-center justify-center relative rounded-full"',
  'onClick={() => triggerHaptic("light")} className="w-10 h-10 flex items-center justify-center relative rounded-full"'
);

fs.writeFileSync("src/components/layout/BottomTabBar.tsx", content, "utf8");
console.log("Updated BottomTabBar.tsx with haptics");
