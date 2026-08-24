const fs = require("fs");

let css = fs.readFileSync("src/index.css", "utf8").replace(/\r\n/g, "\n");
css = css.replace('@import url("https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,300..900;1,300..900&display=swap");\n', '');
fs.writeFileSync("src/index.css", css, "utf8");
console.log("Removed duplicate font import from index.css");
