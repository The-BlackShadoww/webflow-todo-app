import axios from "axios";
import { DEFAULT_LIST_ID } from "@/constants/todo";
import type { TodoSettings, TodoTask } from "@/types";
import { normalizeTasksFromApi } from "@/utils/tasks";

export { DEFAULT_LIST_ID };

const API_CLIENT = axios.create({
  baseURL: import.meta.env.VITE_DATA_CLIENT_URL,
});

export async function validateSite(siteId: string) {
  const { data } = await API_CLIENT.get("/sites/validate", {
    params: { siteId },
  });
  return data as { valid: boolean };
}

export async function getSiteByWebflowSiteId(siteId: string) {
  const { data } = await API_CLIENT.get("/webflow/sites", {
    params: { siteId },
  });
  return data;
}

export async function registerAppScripts(siteId: string) {
  const { data } = await API_CLIENT.post("/webflow/register-app-scripts", {
    siteId,
  });
  return data;
}

export async function logout(siteId: string) {
  await API_CLIENT.delete("/webflow/sites", { params: { siteId } });
}

export async function getTodoSettings(siteId: string) {
  const { data } = await API_CLIENT.get(`/todo/settings/${siteId}`);
  return data.data as TodoSettings | null;
}

export async function saveTodoSettings(siteId: string, settings: TodoSettings) {
  const { data } = await API_CLIENT.post("/todo/settings", {
    siteId,
    settings,
  });
  return data.data as TodoSettings;
}

export async function getTodoTasks(
  siteId: string,
  listId: string = DEFAULT_LIST_ID,
) {
  const { data } = await API_CLIENT.get("/todo/tasks", {
    params: { siteId, listId },
  });
  return normalizeTasksFromApi(data.data);
}

export async function replaceTodoTasks(
  siteId: string,
  tasks: TodoTask[],
  listId: string = DEFAULT_LIST_ID,
) {
  const { data } = await API_CLIENT.put("/todo/tasks", {
    siteId,
    listId,
    tasks: tasks.map((task, index) => ({
      taskId: task.id,
      text: task.text,
      completed: task.completed,
      position: index,
    })),
  });
  return normalizeTasksFromApi(data.data);
}
