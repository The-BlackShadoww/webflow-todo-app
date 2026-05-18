import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cdnReleases } from "@/db/schema";

export async function getLatestCdnRelease() {
  return db.query.cdnReleases.findFirst({
    orderBy: [desc(cdnReleases.createdAt)],
  });
}

export async function upsertCdnRelease(
  version: string,
  hostedLocation: string,
  integrityHash = "",
) {
  const [release] = await db
    .insert(cdnReleases)
    .values({ version, hostedLocation, integrityHash })
    .onConflictDoUpdate({
      target: cdnReleases.version,
      set: { hostedLocation, integrityHash },
    })
    .returning();

  return release;
}

export async function getCdnReleaseByVersion(version: string) {
  return db.query.cdnReleases.findFirst({
    where: eq(cdnReleases.version, version),
  });
}
