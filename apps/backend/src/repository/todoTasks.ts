import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { todoTasks } from "@/db/schema";

export type TodoTaskInput = {
  taskId: string;
  text: string;
  completed?: boolean;
  position?: number;
};

export type TodoTaskPatch = Partial<Pick<TodoTaskInput, "text" | "completed" | "position">>;

function bySiteList(siteId: string, listId: string) {
  return and(eq(todoTasks.siteId, siteId), eq(todoTasks.listId, listId));
}

function byTask(siteId: string, listId: string, taskId: string) {
  return and(bySiteList(siteId, listId), eq(todoTasks.taskId, taskId));
}

async function getTasks(siteId: string, listId: string) {
  return db.query.todoTasks.findMany({
    where: bySiteList(siteId, listId),
    orderBy: [asc(todoTasks.position), asc(todoTasks.id)],
  });
}

async function replaceTasks(siteId: string, listId: string, tasks: TodoTaskInput[]) {
  await db.transaction(async (tx) => {
    await tx.delete(todoTasks).where(bySiteList(siteId, listId));

    if (!tasks.length) return;

    await tx.insert(todoTasks).values(
      tasks.map((task, index) => ({
        siteId,
        listId,
        taskId: task.taskId,
        text: task.text,
        completed: task.completed ?? false,
        position: task.position ?? index,
      })),
    );
  });

  return getTasks(siteId, listId);
}

async function createTask(siteId: string, listId: string, task: TodoTaskInput) {
  const [created] = await db
    .insert(todoTasks)
    .values({
      siteId,
      listId,
      taskId: task.taskId,
      text: task.text,
      completed: task.completed ?? false,
      position: task.position ?? 0,
    })
    .returning();

  return created;
}

async function updateTask(siteId: string, listId: string, taskId: string, patch: TodoTaskPatch) {
  const [updated] = await db
    .update(todoTasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(byTask(siteId, listId, taskId))
    .returning();

  return updated;
}

async function deleteTask(siteId: string, listId: string, taskId: string) {
  await db.delete(todoTasks).where(byTask(siteId, listId, taskId));
}

export default {
  getTasks,
  replaceTasks,
  createTask,
  updateTask,
  deleteTask,
};
