const fs = require("fs");
let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8");

// Compact calendar styles
content = content.replace(
  '<div className="glass-surface p-4 rounded-[24px]">',
  '<div className="glass-surface p-3.5 rounded-[22px]">'
);

content = content.replace(
  '<div className="grid grid-cols-7 gap-y-2.5 gap-x-1 text-center">',
  '<div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">'
);

content = content.replace(
  '<div key={i} className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{w}</div>',
  '<div key={i} className="text-[9px] font-bold mb-0.5" style={{ color: "var(--text-tertiary)" }}>{w}</div>'
);

const oldDayButtonRegex = /return \(\s*<button\s*key=\{d\.toISOString\(\)\}[\s\S]*?<\/button>\s*\)/;

const newDayButton = `return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className="flex flex-col items-center justify-center rounded-lg active:scale-90 transition-transform py-0.5"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold transition-all"
                    style={{
                      background: bg,
                      color: textColor,
                      border,
                      boxShadow: isSel ? "0 0 0 2px var(--text-primary)" : "none"
                    }}
                  >
                    {format(d, "d")}
                  </div>
                  <div className="h-[10px] flex items-center justify-center mt-0.5">
                    {hasTx && net !== 0 ? (
                      <span
                        className="text-[8px] font-extrabold tracking-tighter leading-none truncate max-w-[34px]"
                        style={{
                          color: isSurplus ? "var(--text-primary)" : "var(--text-tertiary)",
                          opacity: isSurplus ? 0.95 : 0.65
                        }}
                      >
                        {formatNetAmount(net)}
                      </span>
                    ) : (
                      <span className="text-[8px] opacity-0 select-none">-</span>
                    )}
                  </div>
                </button>
              )`;

content = content.replace(oldDayButtonRegex, newDayButton);

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("HomePage calendar made compact and proportional");
