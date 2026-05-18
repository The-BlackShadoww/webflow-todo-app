import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites, users } from "@/db/schema";

export type SerializedUser = typeof users.$inferInsert;
export type SerializedSite = Omit<typeof sites.$inferInsert, "userId">;

async function upsertUserAndSites(
  user: SerializedUser,
  siteList: SerializedSite[],
) {
  const [savedUser] = await db
    .insert(users)
    .values(user)
    .onConflictDoUpdate({
      target: users.webflowUserId,
      set: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accessToken: user.accessToken,
        updatedAt: new Date(),
      },
    })
    .returning();

  for (const site of siteList) {
    await db
      .insert(sites)
      .values({ ...site, userId: savedUser.id })
      .onConflictDoUpdate({
        target: sites.siteId,
        set: {
          workspaceId: site.workspaceId,
          displayName: site.displayName,
          previewUrl: site.previewUrl,
          userId: savedUser.id,
          updatedAt: new Date(),
        },
      });
  }

  return savedUser;
}

async function clearAccessToken(userId: number) {
  await db
    .update(users)
    .set({ accessToken: "", updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export default { upsertUserAndSites, clearAccessToken };
