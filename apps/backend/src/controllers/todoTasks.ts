import { RequestHandler } from "express";
import todoTasksRepository, { TodoTaskInput, TodoTaskPatch } from "@/repository/todoTasks";

type RawTask = {
  id?: unknown;
  taskId?: unknown;
  text?: unknown;
  completed?: unknown;
  position?: unknown;
};

function normalizeTask(task: RawTask, index: number): TodoTaskInput | null {
  const taskId = typeof task.taskId === "string"
    ? task.taskId
    : typeof task.id === "string"
      ? task.id
      : `task-${Date.now()}-${index}`;
  const text = typeof task.text === "string" ? task.text.trim() : "";

  if (!text) return null;

  return {
    taskId,
    text,
    completed: task.completed === true,
    position: typeof task.position === "number" ? task.position : index,
  };
}

function serializeTask(task: Awaited<ReturnType<typeof todoTasksRepository.getTasks>>[number]) {
  return {
    id: task.taskId,
    taskId: task.taskId,
    text: task.text,
    completed: task.completed,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function getSiteListFromQuery(req: Parameters<RequestHandler>[0]) {
  const siteId = typeof req.query.siteId === "string" ? req.query.siteId : "";
  const listId = typeof req.query.listId === "string" ? req.query.listId : "";
  return { siteId, listId };
}

export const getTasks: RequestHandler = async (req, res) => {
  const { siteId, listId } = getSiteListFromQuery(req);
  if (!siteId || !listId) {
    return res.status(400).json({ message: "siteId and listId are required" });
  }

  const tasks = await todoTasksRepository.getTasks(siteId, listId);
  return res.status(200).json({ data: tasks.map(serializeTask) });
};

export const replaceTasks: RequestHandler = async (req, res) => {
  const { siteId, listId, tasks } = req.body;
  if (!siteId || !listId) {
    return res.status(400).json({ message: "siteId and listId are required" });
  }
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ message: "tasks must be an array" });
  }

  const normalizedTasks = tasks
    .map((task: RawTask, index: number) => normalizeTask(task, index))
    .filter((task: TodoTaskInput | null): task is TodoTaskInput => Boolean(task));

  const savedTasks = await todoTasksRepository.replaceTasks(siteId, listId, normalizedTasks);
  return res.status(200).json({ success: true, data: savedTasks.map(serializeTask) });
};

export const createTask: RequestHandler = async (req, res) => {
  const { siteId, listId, task } = req.body;
  if (!siteId || !listId) {
    return res.status(400).json({ message: "siteId and listId are required" });
  }

  const normalizedTask = normalizeTask(task || {}, 0);
  if (!normalizedTask) return res.status(400).json({ message: "task.text is required" });

  const created = await todoTasksRepository.createTask(siteId, listId, normalizedTask);
  return res.status(201).json({ success: true, data: serializeTask(created) });
};

export const updateTask: RequestHandler = async (req, res) => {
  const { taskId } = req.params;
  const { siteId, listId, patch = {} } = req.body;
  if (!siteId || !listId || !taskId) {
    return res.status(400).json({ message: "siteId, listId, and taskId are required" });
  }

  const normalizedPatch: TodoTaskPatch = {};
  if (typeof patch.text === "string") normalizedPatch.text = patch.text.trim();
  if (typeof patch.completed === "boolean") normalizedPatch.completed = patch.completed;
  if (typeof patch.position === "number") normalizedPatch.position = patch.position;

  const updated = await todoTasksRepository.updateTask(siteId, listId, taskId, normalizedPatch);
  if (!updated) return res.status(404).json({ message: "Task not found" });

  return res.status(200).json({ success: true, data: serializeTask(updated) });
};

export const deleteTask: RequestHandler = async (req, res) => {
  const { taskId } = req.params;
  const { siteId, listId } = req.body;
  if (!siteId || !listId || !taskId) {
    return res.status(400).json({ message: "siteId, listId, and taskId are required" });
  }

  await todoTasksRepository.deleteTask(siteId, listId, taskId);
  return res.status(200).json({ success: true });
};
