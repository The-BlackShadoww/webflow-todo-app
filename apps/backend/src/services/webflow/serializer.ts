import { encrypt } from "@/lib/crypto";
import type { SerializedSite, SerializedUser } from "@/repository/user";
import type {
  WebflowAuthenticatedUser,
  WebflowSite,
} from "@/services/webflow/api";

export function serializeWebflowUser(
  user: WebflowAuthenticatedUser,
  accessToken: string,
): SerializedUser {
  return {
    webflowUserId: user.id,
    email: user.email,
    firstName: user.firstName || "Webflow",
    lastName: user.lastName || "User",
    accessToken: encrypt(accessToken),
  };
}

export function serializeWebflowSite(site: WebflowSite): SerializedSite {
  return {
    siteId: site.id,
    workspaceId: site.workspaceId,
    displayName: site.displayName || site.shortName || "Untitled site",
    previewUrl: site.previewUrl || null,
  };
}
