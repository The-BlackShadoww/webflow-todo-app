import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import apiRouter from "./api";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:1337";
const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  frontendUrl,
  "http://localhost:1337",
  "http://localhost:3000",
  ...configuredOrigins,
]);

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    return hostname === "webflow.com" || hostname.endsWith(".webflow.io");
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  },
);

app.listen(port, () => {
  console.log(`Todo backend listening on port ${port}`);
});
