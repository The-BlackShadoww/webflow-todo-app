type TodoTask = {
  id: string;
  text: string;
  completed: boolean;
  position: number;
};

type TodoOptions = {
  allowAdd: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  showCompleted: boolean;
  persistInBrowser: boolean;
  theme: "light" | "dark" | "system";
};

type TodoIdentity = {
  siteId: string;
  listId: string;
};

const LOG_TAG = "[todo-cdn]";
const API_BASE_URL = `${__BACKEND_URL__}/api`;
const SELECTORS = {
  root: "flowappz-todo-root",
  form: "flowappz-todo-form",
  input: "flowappz-todo-input",
  addButton: "flowappz-todo-add-button",
  list: "flowappz-todo-list",
  empty: "flowappz-todo-empty",
  itemTemplate: "flowappz-todo-item-template",
  itemAttr: "flowappz-todo-item",
  checkboxAttr: "flowappz-todo-checkbox",
};

function toBool(value: string | null, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function readOptions(root: HTMLElement): TodoOptions {
  return {
    allowAdd: toBool(root.getAttribute("flowappz-todo-allow-add"), true),
    allowEdit: toBool(root.getAttribute("flowappz-todo-allow-edit"), true),
    allowDelete: toBool(root.getAttribute("flowappz-todo-allow-delete"), true),
    showCompleted: toBool(
      root.getAttribute("flowappz-todo-show-completed"),
      true,
    ),
    persistInBrowser: toBool(root.getAttribute("flowappz-todo-persist"), true),
    theme:
      (root.getAttribute("flowappz-todo-theme") as TodoOptions["theme"]) ||
      "system",
  };
}

function readIdentity(root: HTMLElement): TodoIdentity | null {
  const siteId = document.documentElement.getAttribute("data-wf-site") || "";
  const listId = root.getAttribute("flowappz-todo-list-id") || "default";

  if (!siteId) {
    console.error(LOG_TAG, "Missing Webflow site id on html[data-wf-site]");
    return null;
  }

  return { siteId, listId };
}

function getTaskText(item: HTMLElement): string {
  const textEl = Array.from(item.children).find((child) => {
    const element = child as HTMLElement;
    return (
      !element.hasAttribute(SELECTORS.checkboxAttr) &&
      element.tagName !== "BUTTON" &&
      element.tagName !== "INPUT"
    );
  }) as HTMLElement | undefined;

  return (textEl?.innerText || "Untitled task").trim();
}

function getTemplateItems(list: HTMLElement): HTMLElement[] {
  return Array.from(
    list.querySelectorAll<HTMLElement>(`[${SELECTORS.itemAttr}="true"]`),
  );
}

function readInitialTasks(list: HTMLElement): TodoTask[] {
  return getTemplateItems(list).map((item, index) => {
    const checkbox = item.querySelector<HTMLInputElement>(
      `[${SELECTORS.checkboxAttr}="true"]`,
    );
    return {
      id: `task-${index + 1}`,
      text: getTaskText(item),
      completed:
        checkbox?.checked ||
        item.getAttribute("flowappz-todo-completed") === "true",
      position: index,
    };
  });
}

function normalizeApiTasks(tasks: unknown): TodoTask[] {
  if (!Array.isArray(tasks)) return [];

  const normalized = tasks
    .map((task, index) => {
      const raw = task as Partial<TodoTask> & { taskId?: string };
      const id = typeof raw.id === "string" ? raw.id : raw.taskId;
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      if (!id || !text) return null;

      return {
        id,
        text,
        completed: raw.completed === true,
        position: typeof raw.position === "number" ? raw.position : index,
      };
    });

  return normalized.filter((task): task is TodoTask => task !== null);
}

async function fetchDatabaseTasks(identity: TodoIdentity): Promise<TodoTask[]> {
  const params = new URLSearchParams({
    siteId: identity.siteId,
    listId: identity.listId,
  });
  const response = await fetch(`${API_BASE_URL}/todo/tasks?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed to load tasks: ${response.status}`);

  const payload = await response.json();
  return normalizeApiTasks(payload.data);
}

async function saveDatabaseTasks(identity: TodoIdentity, tasks: TodoTask[]): Promise<TodoTask[]> {
  const response = await fetch(`${API_BASE_URL}/todo/tasks`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      siteId: identity.siteId,
      listId: identity.listId,
      tasks: tasks.map((task, index) => ({
        taskId: task.id,
        text: task.text,
        completed: task.completed,
        position: index,
      })),
    }),
  });

  if (!response.ok) throw new Error(`Failed to save tasks: ${response.status}`);

  const payload = await response.json();
  return normalizeApiTasks(payload.data);
}

async function loadTasks(identity: TodoIdentity, list: HTMLElement): Promise<TodoTask[]> {
  const initialTasks = readInitialTasks(list);

  try {
    const databaseTasks = await fetchDatabaseTasks(identity);
    return databaseTasks;
  } catch (error) {
    console.warn(LOG_TAG, "Could not load database tasks. Falling back to pasted tasks.", error);
    return initialTasks;
  }
}

function findTextElement(item: HTMLElement): HTMLElement | null {
  return Array.from(item.children).find((child) => {
    const element = child as HTMLElement;
    return (
      !element.hasAttribute(SELECTORS.checkboxAttr) &&
      element.tagName !== "BUTTON" &&
      element.tagName !== "INPUT"
    );
  }) as HTMLElement | null;
}

function prepareTemplate(list: HTMLElement): HTMLElement {
  const existingTemplate = document.getElementById(
    SELECTORS.itemTemplate,
  ) as HTMLElement | null;
  const template = existingTemplate || getTemplateItems(list)[0];

  if (!template) {
    const fallback = document.createElement("div");
    fallback.setAttribute(SELECTORS.itemAttr, "true");
    fallback.innerHTML = `<input type="checkbox" ${SELECTORS.checkboxAttr}="true"><span>New task</span><button type="button">Delete</button>`;
    return fallback;
  }

  const clone = template.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  return clone;
}

function createStatusElement(root: HTMLElement): HTMLElement {
  const status = document.createElement("div");
  status.setAttribute("flowappz-todo-status", "true");
  status.style.display = "none";
  status.style.marginTop = "10px";
  status.style.fontSize = "13px";
  status.style.opacity = "0.68";
  root.appendChild(status);
  return status;
}

function setStatus(
  status: HTMLElement,
  message: string,
  tone: "info" | "error" = "info",
) {
  status.innerText = message;
  status.style.display = message ? "block" : "none";
  status.style.color = tone === "error" ? "#dc2626" : "inherit";
}

async function renderTodo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(`#${SELECTORS.form}`);
  const input = root.querySelector<HTMLInputElement>(`#${SELECTORS.input}`);
  const listElement = root.querySelector<HTMLElement>(`#${SELECTORS.list}`);
  const empty = root.querySelector<HTMLElement>(`#${SELECTORS.empty}`);

  if (!listElement) {
    console.error(LOG_TAG, "Missing todo list element", root);
    return;
  }

  const parsedIdentity = readIdentity(root);
  if (!parsedIdentity) return;
  const identity: TodoIdentity = parsedIdentity;

  const list = listElement;
  const options = readOptions(root);
  const template = prepareTemplate(list);
  const status = createStatusElement(root);
  let tasks: TodoTask[] = [];
  let saveRequestId = 0;
  let pendingSaves = 0;

  if (options.theme === "dark")
    root.classList.add("flowappz-todo-runtime-dark");
  if (!options.allowAdd && form) form.style.display = "none";

  function commit(nextTasks: TodoTask[]) {
    const requestId = ++saveRequestId;
    tasks = nextTasks.map((task, index) => ({ ...task, position: index }));
    pendingSaves += 1;
    setStatus(status, "Saving tasks...");
    paint();

    saveDatabaseTasks(identity, tasks)
      .then((savedTasks) => {
        pendingSaves = Math.max(0, pendingSaves - 1);
        if (requestId !== saveRequestId) return;
        tasks = savedTasks;
        setStatus(status, pendingSaves ? "Saving tasks..." : "");
        paint();
      })
      .catch((error) => {
        pendingSaves = Math.max(0, pendingSaves - 1);
        console.warn(LOG_TAG, "Could not save database tasks", error);
        setStatus(status, "Could not save tasks. Please try again.", "error");
      });
  }

  function paint() {
    list.innerHTML = "";
    const visibleTasks = options.showCompleted
      ? tasks
      : tasks.filter((task) => !task.completed);

    if (empty) empty.style.display = visibleTasks.length ? "none" : "block";

    visibleTasks.forEach((task) => {
      const item = template.cloneNode(true) as HTMLElement;
      item.removeAttribute("id");
      item.setAttribute(SELECTORS.itemAttr, "true");
      item.setAttribute("flowappz-todo-completed", String(task.completed));

      const checkbox =
        item.querySelector<HTMLInputElement>(
          `[${SELECTORS.checkboxAttr}="true"]`,
        ) || item.querySelector<HTMLInputElement>("input[type='checkbox']");
      if (checkbox) {
        checkbox.checked = task.completed;
        checkbox.addEventListener("change", () => {
          commit(
            tasks.map((current) =>
              current.id === task.id
                ? { ...current, completed: checkbox.checked }
                : current,
            ),
          );
        });
      }

      const textEl = findTextElement(item);
      if (textEl) {
        textEl.innerText = task.text;
        textEl.style.textDecoration = task.completed ? "line-through" : "none";
        textEl.style.opacity = task.completed ? "0.58" : "1";

        if (options.allowEdit) {
          textEl.setAttribute("contenteditable", "true");
          textEl.addEventListener("blur", () => {
            const nextText = textEl.innerText.trim();
            if (!nextText) {
              textEl.innerText = task.text;
              return;
            }
            commit(
              tasks.map((current) =>
                current.id === task.id
                  ? { ...current, text: nextText }
                  : current,
              ),
            );
          });
        }
      }

      const deleteButton = item.querySelector<HTMLButtonElement>("button");
      if (deleteButton) {
        if (!options.allowDelete) {
          deleteButton.style.display = "none";
        } else {
          deleteButton.type = "button";
          deleteButton.addEventListener("click", () => {
            commit(tasks.filter((current) => current.id !== task.id));
          });
        }
      }

      list.appendChild(item);
    });
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!options.allowAdd || !input) return;
    const text = input.value.trim();
    if (!text) return;

    commit([
      ...tasks,
      { id: `task-${Date.now()}`, text, completed: false, position: tasks.length },
    ]);
    input.value = "";
  });

  setStatus(status, "Loading tasks...");
  paint();
  try {
    tasks = await loadTasks(identity, list);
    setStatus(status, "");
  } catch (error) {
    console.warn(LOG_TAG, "Could not load database tasks", error);
    setStatus(status, "Could not load saved tasks. Showing pasted tasks.", "error");
  }
  paint();
}

function init() {
  console.info(
    LOG_TAG,
    `loaded version=${__CDN_VERSION__} backend=${__BACKEND_URL__}`,
  );
  const roots = document.querySelectorAll<HTMLElement>(`#${SELECTORS.root}`);
  roots.forEach((root) => {
    renderTodo(root).catch((error) => console.error(LOG_TAG, "Todo render failed", error));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}




