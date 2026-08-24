const fs = require("fs");

let content = fs.readFileSync("src/main.tsx", "utf8").replace(/\r\n/g, "\n");

content = content.replace(
  `  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }\n`,
  ''
);

fs.writeFileSync("src/main.tsx", content, "utf8");
console.log("Removed aggressive cache purge in main.tsx");
