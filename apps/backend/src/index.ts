import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import apiRouter from "./api";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:1337";

app.use(cors({ origin: frontendUrl, credentials: true }));
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

