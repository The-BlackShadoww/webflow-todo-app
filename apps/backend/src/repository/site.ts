import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites, users } from "@/db/schema";

async function getSiteByWebflowId(siteId: string) {
  return db.query.sites.findFirst({
    where: eq(sites.siteId, siteId),
    with: { user: true },
  });
}

async function getAllSites() {
  return db.query.sites.findMany({ with: { user: true } });
}

async function deleteSite(siteId: string) {
  await db.delete(sites).where(eq(sites.siteId, siteId));
}

async function hasValidSite(siteId: string) {
  const site = await db
    .select({ id: sites.id, accessToken: users.accessToken })
    .from(sites)
    .leftJoin(users, eq(sites.userId, users.id))
    .where(eq(sites.siteId, siteId))
    .limit(1);

  return Boolean(site[0]?.accessToken);
}

export default { getSiteByWebflowId, getAllSites, deleteSite, hasValidSite };
