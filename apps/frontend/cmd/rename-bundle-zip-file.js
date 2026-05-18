import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const mode = process.env.BUILD_MODE || "development";
dotenv.config({ path: `.env.${mode}`, override: true });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    console.log("\n---\nRenaming the bundled zip file according to the app name and environment...");

    const originalFilePath = path.join(__dirname, "../bundle.zip");
    const appName = (process.env.VITE_APP_NAME || process.env.APP_NAME || "todo-app").replace(/\s+/g, "-");
    const environment = process.env.ENVIRONMENT || mode;
    const newFilePath = path.join(__dirname, `../${appName}-${environment}.zip`);

    await fs.rename(originalFilePath, newFilePath);
    console.log("File name:", path.basename(newFilePath));
    console.log("---\n");
  } catch (err) {
    console.log(err);
  } finally {
    process.exit(0);
  }
})();
