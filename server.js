/**
 * Render Standalone Server Entry Point
 * 
 * If deploying to Render with Start Command: "node server.js",
 * this file delegates to the compiled production bundle in "dist/server.cjs".
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const bundledServer = path.resolve(process.cwd(), "dist/server.cjs");

if (fs.existsSync(bundledServer)) {
  require(bundledServer);
} else {
  console.error(
    "[Server Error] 'dist/server.cjs' not found.\n" +
    "Please run 'npm run build' before starting the server."
  );
  process.exit(1);
}
