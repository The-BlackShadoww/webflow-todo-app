const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "public", "index.html");
if (!fs.existsSync(indexPath)) process.exit(0);

let html = fs.readFileSync(indexPath, "utf8");
html = html.replace(/type="module" crossorigin/g, "defer");
fs.writeFileSync(indexPath, html);
