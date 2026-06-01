import type { TodoTask } from "@/types";

type ApiTask = {
  id?: string;
  taskId?: string;
  text?: string;
  completed?: boolean;
  position?: number;
};

export function normalizeTasksFromApi(tasks: unknown): TodoTask[] {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .map((task, index) => {
      const raw = task as ApiTask;
      const id =
        typeof raw.id === "string"
          ? raw.id
          : typeof raw.taskId === "string"
            ? raw.taskId
            : null;
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      if (!id || !text) return null;

      return {
        id,
        text,
        completed: raw.completed === true,
        position: typeof raw.position === "number" ? raw.position : index,
      };
    })
    .filter((task): task is TodoTask & { position: number } => task !== null)
    .sort((a, b) => a.position - b.position)
    .map(({ id, text, completed }) => ({ id, text, completed }));
}
