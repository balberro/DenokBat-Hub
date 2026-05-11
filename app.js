/**
 * Entrada Passenger / Node en producción (Dinahosting).
 * Secretos y variables solo en `app.local.js` (no versionado; ver `app.local.js.example`).
 */
const fs = require("fs");
const path = require("path");

const localPath = path.join(__dirname, "app.local.js");
if (fs.existsSync(localPath)) {
  require(localPath);
}

require("./artifacts/api-server/dist/index.cjs");
