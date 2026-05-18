import axios from "axios";
import type { TodoSettings } from "@/types";

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
