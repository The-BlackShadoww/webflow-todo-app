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

/**
 * Searches every element on the page in a flat list and returns the first
 * element whose DOM ID matches. A single getAllElements() call is far faster
 * than recursive getChildren() traversal because it needs only one round-trip
 * to the Designer canvas.
 */
async function findPageElementByDomId(domId: string): Promise<AnyElement | null> {
  try {
    const all = await webflow.getAllElements();
    for (const el of all) {
      if (el.domId) {
        try {
          const id = await el.getDomId();
          if (id === domId) return el;
        } catch {
          // element may not support getDomId — skip
        }
      }
    }
  } catch (e) {
    console.warn("getAllElements failed:", e);
  }
  return null;
}

/**
 * Finds every Todo delete button on the page by:
 *   1. Collecting all DOM elements whose HTML tag is "button".
 *   2. Calling getStyles() on each to read its Webflow class name.
 *   3. Returning only elements that carry the "flowappz-todo-delete" class.
 *
 * This prevents accidentally toggling the Add button or any other button
 * that happens to be on the same page.
 */
async function findTodoDeleteButtons(): Promise<AnyElement[]> {
  const results: AnyElement[] = [];
  try {
    const all = await webflow.getAllElements();
    for (const el of all) {
      if (el.type !== "DOM" || !el.styles) continue;
      try {
        const tag = await (el as DOMElement).getTag();
        if (tag !== "button") continue;
        const styleList = await (el as DOMElement).getStyles();
        if (!styleList) continue;
        for (const s of styleList) {
          if (!s) continue;
          const name = await s.getName();
          if (name === "flowappz-todo-delete") {
            results.push(el);
            break; // found the class — no need to check remaining styles
          }
        }
      } catch {
        // skip elements that throw (e.g. non-button DOM nodes)
      }
    }
  } catch (e) {
    console.warn("getAllElements failed:", e);
  }
  return results;
}

async function isDescendant(
  element: AnyElement,
  targetId: string,
): Promise<boolean> {
  if (element.id.element === targetId) return true;

  if (element.children) {
    try {
      const children = await element.getChildren();
      for (const child of children) {
        if (await isDescendant(child, targetId)) return true;
      }
    } catch (e) {
      // ignore
    }
  }

  return false;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [activeId, setActiveId] = useState<ViewId>("dashboard");
  const [site, setSite] = useState<WebflowSite | null>(null);
  const [settings, setSettings] = useState<TodoSettings>(defaultSettings);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [selectedElement, setSelectedElement] = useState<AnyElement | null>(null);

  const hydrateSettings = useCallback(async (element: AnyElement) => {
    if (!element.customAttributes) return;
    try {
      const [
        allowAdd,
        allowEdit,
        allowDelete,
        showCompleted,
        persist,
        theme,
      ] = await Promise.all([
        element.getCustomAttribute("flowappz-todo-allow-add"),
        element.getCustomAttribute("flowappz-todo-allow-edit"),
        element.getCustomAttribute("flowappz-todo-allow-delete"),
        element.getCustomAttribute("flowappz-todo-show-completed"),
        element.getCustomAttribute("flowappz-todo-persist"),
        element.getCustomAttribute("flowappz-todo-theme"),
      ]);

      const parsedSettings: TodoSettings = {
        allowAdd: allowAdd !== "false",
        allowEdit: allowEdit !== "false",
        allowDelete: allowDelete !== "false",
        showCompleted: showCompleted !== "false",
        persistInBrowser: persist !== "false",
        theme: (theme === "light" || theme === "dark" || theme === "system"
          ? theme
          : "system") as TodoSettings["theme"],
      };

      setSettings(parsedSettings);
    } catch (error) {
      console.error("Failed to read settings from canvas:", error);
    }
  }, []);

  useEffect(() => {
    window._myWebflow = webflow;

    const unsubscribe = webflow.subscribe("selectedelement", async (element) => {
      console.log("Selected element changed:", element);
      if (!element) {
        setSelectedElement(null);
        return;
      }

      try {
        // 1. Check if the selected element is directly the root
        if (element.customAttributes) {
          const listId = await element.getCustomAttribute("flowappz-todo-list-id");
          if (listId) {
            await hydrateSettings(element);
            setSelectedElement(element);
            return;
          }
        }

        // 2. Check if the selected element is a descendant of any Todo root container on the page
        const allPageElements = await webflow.getAllElements();
        const todoRoots: AnyElement[] = [];
        for (const el of allPageElements) {
          if (el.customAttributes) {
            const listId = await el.getCustomAttribute("flowappz-todo-list-id");
            if (listId) {
              todoRoots.push(el);
            }
          }
        }

        for (const root of todoRoots) {
          if (await isDescendant(root, element.id.element)) {
            await hydrateSettings(root);
            setSelectedElement(root);
            return;
          }
        }
      } catch (error) {
        console.error("Error verifying selected element:", error);
      }

      setSelectedElement(null);
    });

    return () => {
      unsubscribe();
    };
  }, [hydrateSettings]);

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

      // Write to Webflow canvas in real-time if an element is selected
      if (selectedElement && selectedElement.customAttributes) {
        try {
          await Promise.all([
            selectedElement.setCustomAttribute("flowappz-todo-allow-add", String(nextSettings.allowAdd)),
            selectedElement.setCustomAttribute("flowappz-todo-allow-edit", String(nextSettings.allowEdit)),
            selectedElement.setCustomAttribute("flowappz-todo-allow-delete", String(nextSettings.allowDelete)),
            selectedElement.setCustomAttribute("flowappz-todo-show-completed", String(nextSettings.showCompleted)),
            selectedElement.setCustomAttribute("flowappz-todo-persist", String(nextSettings.persistInBrowser)),
            selectedElement.setCustomAttribute("flowappz-todo-theme", nextSettings.theme),
          ]);

                // --- Real-time canvas visibility updates ---
          // We use webflow.getAllElements() (a single flat call) instead of
          // recursive getChildren() traversal to avoid dozens of async RPC calls.

          // 1. Show / hide the add-task form.
          //    setVisibility(bool) is the correct Webflow Designer API: it tells
          //    the canvas to render the element as visible or hidden at the current
          //    breakpoint, which is the design-time equivalent of display:none.
          const formElement = await findPageElementByDomId("flowappz-todo-form");
          if (formElement && formElement.visibility) {
            await formElement.setVisibility(nextSettings.allowAdd);
          }

          // 2. Show / hide only the Todo delete buttons (not the Add button).
          //    findTodoDeleteButtons() identifies them by the "flowappz-todo-delete"
          //    CSS class so no other buttons on the page are affected.
          const deleteButtons = await findTodoDeleteButtons();
          await Promise.all(
            deleteButtons.map((btn) => {
              if (btn.visibility) {
                return btn.setVisibility(nextSettings.allowDelete);
              }
              return Promise.resolve();
            }),
          );
        } catch (error) {
          console.error("Failed to update canvas:", error);
        }
      }

      if (!site?.siteId) return;
      const saved = await apiService.saveTodoSettings(site.siteId, nextSettings);
      setSettings(pickSettings(saved as Record<string, unknown>));
    },
    [site?.siteId, selectedElement],
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
      selectedElement,
    }),
    [site, settings, saveSettings, tasks, saveTasks, selectedElement],
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
