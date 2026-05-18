import { Router } from "express";
import { getSettings, saveSettings } from "@/controllers/todo";

const router = Router();

router.get("/settings/:siteId", getSettings);
router.post("/settings", saveSettings);

export default router;
