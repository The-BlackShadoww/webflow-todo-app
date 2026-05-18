import { Router } from "express";
import {
  getLatestRelease,
  getSiteByWebflowId,
  handleAuthorizationCallback,
  logout,
  registerAllSites,
  registerCustomScript,
  saveCdnRelease,
} from "@/controllers/webflow";
import webflowAuthClient from "@/services/webflow/auth";

const router = Router();

router.get("/install", (req, res) => {
  const { state } = req.query;
  const separator = webflowAuthClient.authorizationUrl.includes("?")
    ? "&"
    : "?";
  const authUrl = state
    ? `${webflowAuthClient.authorizationUrl}${separator}state=${encodeURIComponent(state as string)}`
    : webflowAuthClient.authorizationUrl;

  return res.redirect(authUrl);
});

router.get("/callback", handleAuthorizationCallback);
router.get("/sites", getSiteByWebflowId);
router.delete("/sites", logout);
router.post("/register-app-scripts", registerCustomScript);
router.get("/cdn-release/latest", getLatestRelease);
router.post("/cdn-release", saveCdnRelease);
router.post("/register-all-scripts", registerAllSites);

export default router;
