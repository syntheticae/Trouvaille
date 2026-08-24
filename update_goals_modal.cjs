const fs = require("fs");

// 1. Update HomePage.tsx
let hp = fs.readFileSync("src/pages/HomePage.tsx", "utf8").replace(/\r\n/g, "\n");

if (!hp.includes("GoalDetailModal")) {
  hp = `import { GoalDetailModal } from "../components/goals/GoalDetailModal"\n` + hp;
}

// Add selectedGoal state
hp = hp.replace(
  'const { goals } = useGoals()',
  'const { goals, depositToGoal, updateGoal, deleteGoal } = useGoals()\n  const [selectedGoal, setSelectedGoal] = useState<any | null>(null)'
);

// Make Goal Card interactive
const oldGoalCard = `<div
                  key={g.id}
                  className="p-4 rounded-[22px] glass-surface"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >`;

const newGoalCard = `<div
                  key={g.id}
                  onClick={() => { setSelectedGoal(g); triggerHaptic("light"); }}
                  className="p-4 rounded-[22px] glass-surface cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >`;

hp = hp.replace(oldGoalCard, newGoalCard);

// Render GoalDetailModal at bottom
hp = hp.replace(
  '</BottomSheet>\n    </div>\n  )',
  `</BottomSheet>\n      <GoalDetailModal goal={selectedGoal} isOpen={!!selectedGoal} onClose={() => setSelectedGoal(null)} onDeposit={depositToGoal} onUpdate={updateGoal} onDelete={deleteGoal} />\n    </div>\n  )`
);

fs.writeFileSync("src/pages/HomePage.tsx", hp, "utf8");
console.log("Updated HomePage.tsx with interactive GoalDetailModal");

// 2. Update SettingsPage.tsx
let sp = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8").replace(/\r\n/g, "\n");

if (!sp.includes("GoalDetailModal")) {
  sp = `import { GoalDetailModal } from "../components/goals/GoalDetailModal"\n` + sp;
}

sp = sp.replace(
  'const { goals, addGoal, deleteGoal } = useGoals()',
  'const { goals, addGoal, updateGoal, deleteGoal, depositToGoal } = useGoals()\n  const [selectedGoalSetting, setSelectedGoalSetting] = useState<any | null>(null)'
);

// Make goal in settings open modal on click
const oldSettingGoalItem = `<div key={g.id} className="p-3 rounded-2xl flex items-center justify-between" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>`;

const newSettingGoalItem = `<div key={g.id} onClick={() => { setSelectedGoalSetting(g); triggerHaptic("light"); }} className="p-3 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>`;

sp = sp.replace(oldSettingGoalItem, newSettingGoalItem);

// Render GoalDetailModal in SettingsPage
sp = sp.replace(
  '</BottomSheet>\n    </div>\n  )',
  `</BottomSheet>\n      <GoalDetailModal goal={selectedGoalSetting} isOpen={!!selectedGoalSetting} onClose={() => setSelectedGoalSetting(null)} onDeposit={depositToGoal} onUpdate={updateGoal} onDelete={deleteGoal} />\n    </div>\n  )`
);

fs.writeFileSync("src/pages/SettingsPage.tsx", sp, "utf8");
console.log("Updated SettingsPage.tsx with GoalDetailModal");
