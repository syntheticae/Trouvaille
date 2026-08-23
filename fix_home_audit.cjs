const fs = require("fs");
let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8");

// 1. Add formatNetAmount helper function if not present
if (!content.includes("function formatNetAmount") && !content.includes("const formatNetAmount")) {
  const helperCode = `
function formatNetAmount(net: number): string {
  const abs = Math.abs(net)
  let val = ""
  if (abs >= 1000000) {
    val = (abs / 1000000).toFixed(1).replace(/\\.0$/, "") + "m"
  } else if (abs >= 1000) {
    val = Math.round(abs / 1000) + "k"
  } else {
    val = abs.toString()
  }
  return net < 0 ? \`-\${val}\` : \`+\${val}\`
}
`;
  content = helperCode + "\n" + content;
}

// 2. Replace the calendar day button rendering to include the amount under the date
const oldCalendarDayRegex = /return \(\s*<button\s*key=\{d\.toISOString\(\)\}[\s\S]*?\{format\(d, "d"\)\}\s*<\/div>\s*<\/button>\s*\)/;

const newCalendarDayCode = `return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className="flex flex-col items-center justify-center rounded-xl active:scale-90 transition-transform py-0.5"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-extrabold transition-all"
                    style={{
                      background: bg,
                      color: textColor,
                      border,
                      boxShadow: isSel ? "0 0 0 2px var(--text-primary)" : "none"
                    }}
                  >
                    {format(d, "d")}
                  </div>
                  <div className="h-[12px] flex items-center justify-center mt-1">
                    {hasTx ? (
                      <span
                        className="text-[9px] font-extrabold tracking-tighter leading-none truncate max-w-[38px]"
                        style={{
                          color: isSurplus ? "var(--text-primary)" : "var(--text-tertiary)",
                          opacity: isSurplus ? 0.95 : 0.65
                        }}
                      >
                        {formatNetAmount(net)}
                      </span>
                    ) : (
                      <span className="text-[9px] opacity-0 select-none">-</span>
                    )}
                  </div>
                </button>
              )`;

content = content.replace(oldCalendarDayRegex, newCalendarDayCode);

// 3. Fix corrupted emoji in Upcoming Bills
content = content.replace(
  /<div className="w-9 h-9 rounded-xl flex items-center justify-center text-\[16px\]"[\s\S]*?<\/div>/,
  `<div className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px]"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                    <Bell size={16} />
                  </div>`
);

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("HomePage calendar and Upcoming Bills audited and fixed successfully");
