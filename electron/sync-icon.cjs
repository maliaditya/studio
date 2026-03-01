const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const customSourceIcon = path.join(root, "electron", "assets", "icon-user.ico");
const targetDir = path.join(root, "electron", "assets");
const targetIcon = path.join(targetDir, "icon.ico");
fs.mkdirSync(targetDir, { recursive: true });

if (fs.existsSync(customSourceIcon)) {
  fs.copyFileSync(customSourceIcon, targetIcon);
  console.log(`[icon-sync] Synced ${customSourceIcon} -> ${targetIcon}`);
  process.exit(0);
}

if (fs.existsSync(targetIcon)) {
  console.log(`[icon-sync] Keeping existing icon: ${targetIcon}`);
  process.exit(0);
}

console.error(`[icon-sync] No icon source found. Checked: ${customSourceIcon}, ${targetIcon}`);
process.exit(1);
