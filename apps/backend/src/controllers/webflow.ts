import { RequestHandler } from "express";
import { decrypt } from "@/lib/crypto";
import { injectTodoScript } from "@/lib/injectTodoScript";
import { getLatestCdnRelease, upsertCdnRelease } from "@/repository/cdnRelease";
import siteRepository from "@/repository/site";
import userRepository from "@/repository/user";
import WebflowApiClient from "@/services/webflow/api";
import webflowAuthClient from "@/services/webflow/auth";
import {
  serializeWebflowSite,
  serializeWebflowUser,
} from "@/services/webflow/serializer";

const WEBFLOW_DASHBOARD_URL = "https://webflow.com/dashboard";

async function saveAllSitesWithUser(
  serializedUser: ReturnType<typeof serializeWebflowUser>,
  accessToken: string,
) {
  const webflowApiClient = new WebflowApiClient(accessToken);
  const siteList = await webflowApiClient.getSitesList();
  await userRepository.upsertUserAndSites(
    serializedUser,
    siteList.map(serializeWebflowSite),
  );
}

async function saveTargetSiteWithUser(
  serializedUser: ReturnType<typeof serializeWebflowUser>,
  accessToken: string,
  siteId: string,
) {
  const webflowApiClient = new WebflowApiClient(accessToken);
  const site = await webflowApiClient.getSite(siteId);
  await userRepository.upsertUserAndSites(serializedUser, [
    serializeWebflowSite(site),
  ]);
}

export const handleAuthorizationCallback: RequestHandler = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({ error, error_description });
    }

    if (!code) return res.status(400).json({ message: "Missing OAuth code" });

    const accessToken = await webflowAuthClient.exchangeCodeForAccessToken(
      code as string,
    );
    const webflowApiClient = new WebflowApiClient(accessToken);
    const webflowUser = await webflowApiClient.getAuthenticatedUser();
    const serializedUser = serializeWebflowUser(webflowUser, accessToken);

    if (state) {
      const { siteId, returnUrl } = JSON.parse(
        Buffer.from(state as string, "base64").toString("utf8"),
      );
      if (siteId)
        await saveTargetSiteWithUser(serializedUser, accessToken, siteId);
      await saveAllSitesWithUser(serializedUser, accessToken);
      return res.redirect(returnUrl || WEBFLOW_DASHBOARD_URL);
    }

    await saveAllSitesWithUser(serializedUser, accessToken);
    return res.redirect(WEBFLOW_DASHBOARD_URL);
  } catch (error) {
    console.error("Webflow OAuth callback failed", error);
    return res
      .status(500)
      .json({ message: "Something went wrong during Webflow authentication" });
  }
};

export const getSiteByWebflowId: RequestHandler = async (req, res) => {
  const { siteId } = req.query;
  if (!siteId) return res.status(400).json({ message: "siteId is required" });

  const site = await siteRepository.getSiteByWebflowId(siteId as string);
  if (!site) return res.status(404).json({ message: "Site not found" });

  const { user: _user, ...siteWithoutUser } = site;
  return res.status(200).json(siteWithoutUser);
};

export const registerCustomScript: RequestHandler = async (req, res) => {
  try {
    const { siteId } = req.body;
    if (!siteId) return res.status(400).json({ message: "siteId is required" });

    const site = await siteRepository.getSiteByWebflowId(siteId);
    if (!site?.user?.accessToken)
      return res.status(404).json({ message: "Site is not authenticated" });

    await injectTodoScript(site.siteId, decrypt(site.user.accessToken));
    return res.status(200).json({ success: true });
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 401)
      return res
        .status(401)
        .json({ message: "Access token expired. Please re-authenticate." });
    console.error("Register todo script failed", error?.message || error);
    return res.status(500).json({ message: "Could not register todo script" });
  }
};

export const getLatestRelease: RequestHandler = async (_req, res) => {
  const release = await getLatestCdnRelease();
  return res.status(200).json({ release });
};

export const saveCdnRelease: RequestHandler = async (req, res) => {
  const { version, hostedLocation, integrityHash = "" } = req.body;
  if (!version || !hostedLocation) {
    return res
      .status(400)
      .json({ message: "version and hostedLocation are required" });
  }

  const release = await upsertCdnRelease(
    version,
    hostedLocation,
    integrityHash,
  );
  return res.status(200).json({ success: true, release });
};

export const registerAllSites: RequestHandler = async (_req, res) => {
  const allSites = await siteRepository.getAllSites();
  const results = await Promise.allSettled(
    allSites
      .filter((site) => site.user?.accessToken)
      .map((site) =>
        injectTodoScript(site.siteId, decrypt(site.user!.accessToken)),
      ),
  );

  return res.status(200).json({ results });
};

export const logout: RequestHandler = async (req, res) => {
  const { siteId } = req.query;
  if (!siteId) return res.status(400).json({ message: "siteId is required" });

  const site = await siteRepository.getSiteByWebflowId(siteId as string);
  if (!site?.userId) return res.status(404).json({ message: "Site not found" });

  await userRepository.clearAccessToken(site.userId);
  return res.status(200).json({ success: true });
};
