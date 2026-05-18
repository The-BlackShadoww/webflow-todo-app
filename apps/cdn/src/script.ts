type TodoTask = {
  id: string;
  text: string;
  completed: boolean;
};

type TodoOptions = {
  allowAdd: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  showCompleted: boolean;
  persistInBrowser: boolean;
  theme: "light" | "dark" | "system";
};

const LOG_TAG = "[todo-cdn]";
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

function getStorageKey(root: HTMLElement): string {
  const siteId =
    document.documentElement.getAttribute("data-wf-site") || "unknown-site";
  const rootIndex = Array.from(
    document.querySelectorAll(`#${SELECTORS.root}`),
  ).indexOf(root);
  return `flowappz-todo:${siteId}:${rootIndex}`;
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
    };
  });
}

function loadTasks(
  root: HTMLElement,
  list: HTMLElement,
  options: TodoOptions,
): TodoTask[] {
  const initialTasks = readInitialTasks(list);
  if (!options.persistInBrowser) return initialTasks;

  try {
    const raw = localStorage.getItem(getStorageKey(root));
    if (!raw) return initialTasks;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialTasks;
    return parsed.filter((task) => typeof task?.text === "string");
  } catch (error) {
    console.warn(LOG_TAG, "Could not read saved tasks", error);
    return initialTasks;
  }
}

function saveTasks(root: HTMLElement, options: TodoOptions, tasks: TodoTask[]) {
  if (!options.persistInBrowser) return;
  try {
    localStorage.setItem(getStorageKey(root), JSON.stringify(tasks));
  } catch (error) {
    console.warn(LOG_TAG, "Could not save tasks", error);
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

function renderTodo(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>(`#${SELECTORS.form}`);
  const input = root.querySelector<HTMLInputElement>(`#${SELECTORS.input}`);
  const listElement = root.querySelector<HTMLElement>(`#${SELECTORS.list}`);
  const empty = root.querySelector<HTMLElement>(`#${SELECTORS.empty}`);

  if (!listElement) {
    console.error(LOG_TAG, "Missing todo list element", root);
    return;
  }

  const list = listElement;
  const options = readOptions(root);
  const template = prepareTemplate(list);
  let tasks = loadTasks(root, list, options);

  if (options.theme === "dark")
    root.classList.add("flowappz-todo-runtime-dark");
  if (!options.allowAdd && form) form.style.display = "none";

  function commit(nextTasks: TodoTask[]) {
    tasks = nextTasks;
    saveTasks(root, options, tasks);
    paint();
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

    commit([...tasks, { id: `task-${Date.now()}`, text, completed: false }]);
    input.value = "";
  });

  paint();
}

function init() {
  console.info(
    LOG_TAG,
    `loaded version=${__CDN_VERSION__} backend=${__BACKEND_URL__}`,
  );
  const roots = document.querySelectorAll<HTMLElement>(`#${SELECTORS.root}`);
  roots.forEach(renderTodo);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
