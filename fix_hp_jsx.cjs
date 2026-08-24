const fs = require("fs");

let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8").replace(/\r\n/g, "\n");

content = content.replace(
  'return (\n    <div className="px-5 pt-6 space-y-4 pb-32">',
  'return (\n    <div className="px-5 pt-6 space-y-4 pb-32 relative">\n      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} threshold={threshold} />'
);

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("Rendered PullToRefreshIndicator in HomePage.tsx");
