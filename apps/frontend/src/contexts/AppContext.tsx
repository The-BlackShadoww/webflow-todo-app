import { createContext, useContext } from "react";
import type { TodoSettings, WebflowSite } from "@/types";

export type AppContextValue = {
  site: WebflowSite | null;
  settings: TodoSettings;
  setSettings: (settings: TodoSettings) => void;
  saveSettings: (settings: TodoSettings) => Promise<void>;
};

export const defaultSettings: TodoSettings = {
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  showCompleted: true,
  persistInBrowser: true,
  theme: "system",
  initialTasks: [
    { id: "task-1", text: "Plan the Webflow page", completed: false },
    { id: "task-2", text: "Paste the todo element", completed: false },
    { id: "task-3", text: "Publish and test", completed: false },
  ],
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used inside AppContext.Provider");
  return context;
}
