import { createContext, useContext } from "react";
import type { TodoSettings, TodoTask, WebflowSite } from "@/types";

export type AppContextValue = {
  site: WebflowSite | null;
  settings: TodoSettings;
  setSettings: (settings: TodoSettings) => void;
  saveSettings: (settings: TodoSettings) => Promise<void>;
  tasks: TodoTask[];
  setTasks: (tasks: TodoTask[]) => void;
  saveTasks: (tasks: TodoTask[]) => Promise<void>;
};

export const defaultSettings: TodoSettings = {
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  showCompleted: true,
  persistInBrowser: true,
  theme: "system",
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used inside AppContext.Provider");
  return context;
}
