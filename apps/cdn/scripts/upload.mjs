import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { execSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const env = args[0];

if (!["dev", "staging", "production"].includes(env)) {
  console.error(
    "Usage: node upload.mjs <dev|staging|production> [--nr [patch|minor|major]]",
  );
  process.exit(1);
}

const nrIndex = args.indexOf("--nr");
const bump = nrIndex !== -1 ? args[nrIndex + 1] || "patch" : null;
if (bump && !["patch", "minor", "major"].includes(bump)) {
  console.error(`Invalid bump type "${bump}". Use patch, minor, or major.`);
  process.exit(1);
}

const envFile = env === "dev" ? ".env" : `.env.${env}`;
dotenv.config({ path: resolve(__dirname, "..", envFile) });

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
  BACKEND_URL,
  BACKEND_ADMIN_URL,
} = process.env;

const backendAdminUrl = BACKEND_ADMIN_URL || `${BACKEND_URL}/api`;

if (!BACKEND_URL || !backendAdminUrl) {
  console.error("BACKEND_URL is required in the CDN env file");
  process.exit(1);
}

const latestRes = await fetch(`${backendAdminUrl}/webflow/cdn-release/latest`);
if (!latestRes.ok) {
  console.error("Failed to fetch latest release:", await latestRes.text());
  process.exit(1);
}

let { release } = await latestRes.json();
if (!release?.version) {
  if (!bump) {
    console.error(
      "No release found in DB. Use --nr to create the first release.",
    );
    process.exit(1);
  }
  release = { version: "0.0.0" };
}

const currentVersion = release.version;
let version = currentVersion;
if (bump) {
  const [major, minor, patch] = currentVersion
    .replace(/-.*$/, "")
    .split(".")
    .map(Number);
  if (bump === "major") version = `${major + 1}.0.0`;
  if (bump === "minor") version = `${major}.${minor + 1}.0`;
  if (bump === "patch") version = `${major}.${minor}.${patch + 1}`;
}

console.log(`[todo-cdn] Building v${version}`);
execSync("pnpm build", {
  cwd: resolve(__dirname, ".."),
  stdio: "inherit",
  env: { ...process.env, VERSION: version, BACKEND_URL },
});

const filePath = resolve(__dirname, `../dist/${version}/script.js`);
const body = readFileSync(filePath);
const integrityHash =
  "sha384-" + createHash("sha384").update(body).digest("base64");

let hostedLocation = `${process.env.PUBLIC_CDN_BASE_URL || ""}/${version}/script.js`;

if (
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET &&
  R2_PUBLIC_BASE_URL
) {
  const key = `todo-app/${env}/${version}/script.js`;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/javascript",
      CacheControl: "no-cache, no-store",
    }),
  );

  hostedLocation = `${R2_PUBLIC_BASE_URL}/${key}`;
  console.log(`[todo-cdn] Uploaded ${hostedLocation}`);
} else {
  console.log(
    "[todo-cdn] R2 env vars not set. Skipping upload and registering PUBLIC_CDN_BASE_URL location.",
  );
}

if (!hostedLocation || hostedLocation.startsWith("/")) {
  console.error(
    "Could not resolve hostedLocation. Set PUBLIC_CDN_BASE_URL or R2_PUBLIC_BASE_URL.",
  );
  process.exit(1);
}

const saveRes = await fetch(`${backendAdminUrl}/webflow/cdn-release`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ version, hostedLocation, integrityHash }),
});

if (!saveRes.ok) {
  console.error("Failed to save release metadata:", await saveRes.text());
  process.exit(1);
}

console.log(`[todo-cdn] Release saved: v${version}`);
