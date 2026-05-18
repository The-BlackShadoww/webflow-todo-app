import { eq } from "drizzle-orm";
import { db } from "@/db";
import { todoSettings } from "@/db/schema";

export type TodoSettingsInput = Omit<
  typeof todoSettings.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

export async function getTodoSettings(siteId: string) {
  return db.query.todoSettings.findFirst({
    where: eq(todoSettings.siteId, siteId),
  });
}

export async function upsertTodoSettings(settings: TodoSettingsInput) {
  const [saved] = await db
    .insert(todoSettings)
    .values(settings)
    .onConflictDoUpdate({
      target: todoSettings.siteId,
      set: {
        allowAdd: settings.allowAdd,
        allowEdit: settings.allowEdit,
        allowDelete: settings.allowDelete,
        showCompleted: settings.showCompleted,
        persistInBrowser: settings.persistInBrowser,
        theme: settings.theme,
        initialTasks: settings.initialTasks,
        updatedAt: new Date(),
      },
    })
    .returning();

  return saved;
}
