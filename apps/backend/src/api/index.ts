import { Router } from "express";
import sitesRouter from "./sites";
import todoRouter from "./todo";
import webflowRouter from "./webflow";

const router = Router();

router.get("/health", (_req, res) =>
  res.status(200).json({ ok: true, service: "todo-backend" }),
);
router.use("/sites", sitesRouter);
router.use("/todo", todoRouter);
router.use("/webflow", webflowRouter);

export default router;
