import { Router } from "express";
import { validateSite } from "@/controllers/sites";

const router = Router();

router.get("/validate", validateSite);

export default router;
