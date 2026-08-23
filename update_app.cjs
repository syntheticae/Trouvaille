const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf8");

content = 'import { LoadingScreen } from "./components/ui/LoadingScreen"\n' + content;
content = content.replace(
  /if \(loading\) \{[\s\S]*?return \([\s\S]*?\}\s*\}/,
  'if (loading) {\n    return <LoadingScreen />\n  }'
);

fs.writeFileSync("src/App.tsx", content, "utf8");
console.log("Updated App.tsx with LoadingScreen");
