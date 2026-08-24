const fs = require("fs");

// 1. GoalDetailModal.tsx
let gm = fs.readFileSync("src/components/goals/GoalDetailModal.tsx", "utf8").replace(/\r\n/g, "\n");
gm = gm.replaceAll('"create"', '"add"');
fs.writeFileSync("src/components/goals/GoalDetailModal.tsx", gm, "utf8");
console.log("Fixed GoalDetailModal.tsx action types");

// 2. HomePage.tsx
let hp = fs.readFileSync("src/pages/HomePage.tsx", "utf8").replace(/\r\n/g, "\n");
const hpEndTarget = '<NotificationSheet isOpen={notifOpen} onClose={() => setNotifOpen(false)} />';
const hpEndReplacement = `<NotificationSheet isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <GoalDetailModal goal={selectedGoal} isOpen={!!selectedGoal} onClose={() => setSelectedGoal(null)} onDeposit={depositToGoal} onUpdate={updateGoal} onDelete={deleteGoal} />`;

hp = hp.replace(hpEndTarget, hpEndReplacement);
fs.writeFileSync("src/pages/HomePage.tsx", hp, "utf8");
console.log("Placed GoalDetailModal in HomePage.tsx");

// 3. SettingsPage.tsx
let sp = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8").replace(/\r\n/g, "\n");
if (!sp.includes('import { triggerHaptic }')) {
  sp = `import { triggerHaptic } from "../lib/haptics"\n` + sp;
}

const spEndTarget = `        </div>
      </BottomSheet>

    </div>
  )`;

const spEndReplacement = `        </div>
      </BottomSheet>

      <GoalDetailModal goal={selectedGoalSetting} isOpen={!!selectedGoalSetting} onClose={() => setSelectedGoalSetting(null)} onDeposit={depositToGoal} onUpdate={updateGoal} onDelete={deleteGoal} />
    </div>
  )`;

sp = sp.replace(spEndTarget, spEndReplacement);
fs.writeFileSync("src/pages/SettingsPage.tsx", sp, "utf8");
console.log("Placed GoalDetailModal and triggerHaptic in SettingsPage.tsx");
