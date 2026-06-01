import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Sidebar } from "@/components/Sidebar";
import { AppContext, defaultSettings } from "@/contexts/AppContext";
import * as apiService from "@/services/apiService";
import type { TodoSettings, TodoTask, WebflowSite } from "@/types";
import AuthScreen from "@/views/AuthScreen";
import CopyElementView from "@/views/CopyElementView";
import Dashboard from "@/views/Dashboard";
import LoadingScreen from "@/views/LoadingScreen";
import SettingsView from "@/views/SettingsView";
import TasksView from "@/views/TasksView";

type ViewId = "dashboard" | "tasks" | "settings" | "copy";

function pickSettings(remote: Record<string, unknown> | null): TodoSettings {
  if (!remote) return defaultSettings;

  const theme = remote.theme;
  const validTheme =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : defaultSettings.theme;

  return {
    allowAdd: remote.allowAdd !== false,
    allowEdit: remote.allowEdit !== false,
    allowDelete: remote.allowDelete !== false,
    showCompleted: remote.showCompleted !== false,
    persistInBrowser: remote.persistInBrowser !== false,
    theme: validTheme,
  };
}

function App() {
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [activeId, setActiveId] = useState<ViewId>("dashboard");
  const [site, setSite] = useState<WebflowSite | null>(null);
  const [settings, setSettings] = useState<TodoSettings>(defaultSettings);
  const [tasks, setTasks] = useState<TodoTask[]>([]);

  useEffect(() => {
    window._myWebflow = webflow;
  }, []);

  useEffect(() => {
    async function setupApp() {
      try {
        const { siteId } = await window._myWebflow.getSiteInfo();
        const validation = await apiService.validateSite(siteId);

        if (!validation.valid) {
          setNeedsAuth(true);
          return;
        }

        const [siteData, remoteSettings, remoteTasks] = await Promise.all([
          apiService.getSiteByWebflowSiteId(siteId),
          apiService.getTodoSettings(siteId),
          apiService.getTodoTasks(siteId),
        ]);

        setSite(siteData);
        setSettings(pickSettings(remoteSettings as Record<string, unknown> | null));
        setTasks(remoteTasks);

        apiService.registerAppScripts(siteId).catch((error) => {
          console.warn("Todo CDN script is not registered yet.", error);
        });
      } catch (error) {
        if (
          isAxiosError(error) &&
          [400, 401, 404].includes(error.response?.status || 0)
        ) {
          setNeedsAuth(true);
          return;
        }
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    setupApp();
  }, []);

  const saveSettings = useCallback(
    async (nextSettings: TodoSettings) => {
      setSettings(nextSettings);
      if (!site?.siteId) return;
      const saved = await apiService.saveTodoSettings(site.siteId, nextSettings);
      setSettings(pickSettings(saved as Record<string, unknown>));
    },
    [site?.siteId],
  );

  const saveTasks = useCallback(
    async (nextTasks: TodoTask[]) => {
      setTasks(nextTasks);
      if (!site?.siteId) return;
      const saved = await apiService.replaceTodoTasks(site.siteId, nextTasks);
      setTasks(saved);
    },
    [site?.siteId],
  );

  const handleLogout = async () => {
    try {
      const { siteId } = await window._myWebflow.getSiteInfo();
      await apiService.logout(siteId);
    } finally {
      setNeedsAuth(true);
    }
  };

  const contextValue = useMemo(
    () => ({
      site,
      settings,
      setSettings,
      saveSettings,
      tasks,
      setTasks,
      saveTasks,
    }),
    [site, settings, saveSettings, tasks, saveTasks],
  );

  if (loading) return <LoadingScreen message="Checking Webflow site..." />;
  if (needsAuth) return <AuthScreen />;

  return (
    <AppContext.Provider value={contextValue}>
      <main className="flex h-screen w-full overflow-hidden bg-[#1e1e1e] text-white">
        <Sidebar
          activeId={activeId}
          onSelect={(id) => setActiveId(id as ViewId)}
          onLogout={handleLogout}
        />
        <div className="min-w-0 flex-1">
          {activeId === "dashboard" && <Dashboard />}
          {activeId === "tasks" && <TasksView />}
          {activeId === "settings" && <SettingsView />}
          {activeId === "copy" && <CopyElementView />}
        </div>
      </main>
    </AppContext.Provider>
  );
}

export default App;
