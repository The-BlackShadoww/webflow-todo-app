import type { TodoSettings, TodoTask } from "@/types";

type XscpTextNode = {
  _id: string;
  text: true;
  v: string;
};

type XscpNode = {
  _id: string;
  type: string;
  tag: string;
  classes: string[];
  children: string[];
  data: Record<string, unknown>;
};

type XscpStyle = {
  _id: string;
  fake: boolean;
  type: "class";
  name: string;
  namespace: string;
  comb: string;
  styleLess: string;
  variants: Record<string, unknown>;
  children: unknown[];
  selector?: null;
};

type XscpNodes = Array<XscpNode | XscpTextNode>;

function newId(): string {
  return crypto.randomUUID();
}

function blockData(
  tag: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    text: false,
    tag,
    attr: { id: "" },
    xattr: [],
    search: { exclude: false },
    visibility: { conditions: [] },
    displayName: "",
    devlink: { runtimeProps: {}, slot: "" },
    ...extra,
  };
}

function style(classId: string, name: string, styleLess: string): XscpStyle {
  return {
    _id: classId,
    fake: false,
    type: "class",
    name,
    namespace: "",
    comb: "",
    styleLess,
    variants: {},
    children: [],
    selector: null,
  };
}

function domAttributes(
  attrs: Record<string, string | boolean | number>,
): Array<{ name: string; value: string }> {
  return Object.entries(attrs).map(([name, value]) => ({
    name,
    value: String(value),
  }));
}

class TemplateBuilder {
  readonly nodes: XscpNodes = [];
  readonly styles: XscpStyle[] = [];

  addStyle(name: string, styleLess: string): string {
    const classId = newId();
    this.styles.push(style(classId, name, styleLess));
    return classId;
  }

  addBlock(
    tag: string,
    classId: string,
    children: string[],
    data: Record<string, unknown>,
  ): string {
    const id = newId();
    this.nodes.push({
      _id: id,
      type: "Block",
      tag,
      classes: classId ? [classId] : [],
      children,
      data: blockData(tag, data),
    });
    return id;
  }

  addDom(
    htmlTag: string,
    classId: string,
    children: string[],
    attributes: Record<string, string | boolean | number>,
    xattr: Array<{ name: string; value: string }> = [],
  ): string {
    const id = newId();
    this.nodes.push({
      _id: id,
      type: "DOM",
      tag: "motion.div",
      classes: classId ? [classId] : [],
      children,
      data: {
        editable: true,
        tag: htmlTag,
        attributes: domAttributes(attributes),
        xattr,
      },
    });
    return id;
  }

  addTextBlock(
    htmlTag: string,
    classId: string,
    text: string,
    data: Record<string, unknown> = {},
  ): string {
    const textId = newId();
    const blockId = this.addBlock(
      htmlTag,
      classId,
      [textId],
      { ...data, text: true },
    );
    this.nodes.push({ _id: textId, text: true, v: text });
    return blockId;
  }

  addButton(
    classId: string,
    label: string,
    attributes: Record<string, string | boolean | number>,
  ): string {
    const textId = newId();
    const textWrapId = newId();
    const buttonId = this.addDom("button", classId, [textWrapId], attributes);
    this.nodes.push({
      _id: textWrapId,
      type: "Block",
      tag: "motion.div",
      classes: [],
      children: [textId],
      data: blockData("motion.div", { text: true }),
    });
    this.nodes.push({ _id: textId, text: true, v: label });
    return buttonId;
  }

  addInput(
    classId: string,
    attributes: Record<string, string | boolean | number>,
    xattr: Array<{ name: string; value: string }> = [],
  ): string {
    return this.addDom("input", classId, [], attributes, xattr);
  }
}

function createTaskNodes(
  builder: TemplateBuilder,
  classIds: {
    item: string;
    checkbox: string;
    text: string;
    deleteButton: string;
  },
  task: TodoTask,
  index: number,
): string {
  const checkboxId = builder.addInput(
    classIds.checkbox,
    {
      type: "checkbox",
      checked: task.completed,
    },
    [{ name: "flowappz-todo-checkbox", value: "true" }],
  );
  const textId = builder.addTextBlock("div", classIds.text, task.text);
  const deleteId = builder.addButton(classIds.deleteButton, "Delete", {
    type: "button",
  });

  return builder.addBlock(
    "div",
    classIds.item,
    [checkboxId, textId, deleteId],
    {
      attr: { id: index === 0 ? "flowappz-todo-item-template" : "" },
      xattr: [
        { name: "flowappz-todo-item", value: "true" },
        { name: "flowappz-todo-completed", value: String(task.completed) },
      ],
    },
  );
}

export function buildTodoWebflowTemplate(settings: TodoSettings) {
  const todoListId = crypto.randomUUID();
  const tasks = settings.initialTasks.length
    ? settings.initialTasks
    : [{ id: "task-empty", text: "New task", completed: false }];

  const builder = new TemplateBuilder();

  const classIds = {
    root: builder.addStyle(
      "flowappz-todo-root",
      "max-width: 640px; margin-right: auto; margin-left: auto; padding-top: 24px; padding-right: 24px; padding-bottom: 24px; padding-left: 24px; border: 1px solid hsla(220, 13%, 84%, 1); border-radius: 8px; background-color: hsla(0, 0%, 100%, 1); color: hsla(222, 47%, 11%, 1);",
    ),
    header: builder.addStyle(
      "flowappz-todo-header",
      "display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;",
    ),
    title: builder.addStyle(
      "flowappz-todo-title",
      "margin-top: 0px; margin-bottom: 0px; font-size: 24px; line-height: 1.25; font-weight: 700;",
    ),
    form: builder.addStyle(
      "flowappz-todo-form",
      "display: flex; width: 100%; grid-column-gap: 8px; grid-row-gap: 8px; margin-bottom: 16px;",
    ),
    input: builder.addStyle(
      "flowappz-todo-input",
      "width: 100%; min-height: 42px; padding-top: 8px; padding-right: 12px; padding-bottom: 8px; padding-left: 12px; border: 1px solid hsla(220, 13%, 84%, 1); border-radius: 6px;",
    ),
    addButton: builder.addStyle(
      "flowappz-todo-add-button",
      "min-height: 42px; padding-right: 16px; padding-left: 16px; border-radius: 6px; background-color: hsla(207, 100%, 40%, 1); color: white; font-weight: 700;",
    ),
    list: builder.addStyle(
      "flowappz-todo-list",
      "display: flex; flex-direction: column; grid-column-gap: 8px; grid-row-gap: 8px;",
    ),
    item: builder.addStyle(
      "flowappz-todo-item",
      "display: flex; align-items: center; grid-column-gap: 10px; grid-row-gap: 10px; padding-top: 10px; padding-right: 12px; padding-bottom: 10px; padding-left: 12px; border: 1px solid hsla(220, 13%, 91%, 1); border-radius: 6px;",
    ),
    checkbox: builder.addStyle(
      "flowappz-todo-checkbox",
      "width: 18px; height: 18px; flex: 0 0 auto;",
    ),
    text: builder.addStyle(
      "flowappz-todo-text",
      "flex: 1 1 auto; font-size: 15px; line-height: 1.4;",
    ),
    deleteButton: builder.addStyle(
      "flowappz-todo-delete",
      "padding-top: 6px; padding-right: 10px; padding-bottom: 6px; padding-left: 10px; border-radius: 5px; background-color: hsla(0, 84%, 60%, 1); color: white; font-size: 12px;",
    ),
    empty: builder.addStyle(
      "flowappz-todo-empty",
      "display: none; padding-top: 12px; color: hsla(220, 9%, 46%, 1); font-size: 14px;",
    ),
  };

  const titleId = builder.addTextBlock("h2", classIds.title, "Todo List");
  const headerId = builder.addBlock("motion.div", classIds.header, [titleId], {});

  const inputId = builder.addInput(classIds.input, {
    id: "flowappz-todo-input",
    name: "todo",
    placeholder: "Add a task",
    type: "text",
  });
  const addButtonId = builder.addButton(classIds.addButton, "Add", {
    id: "flowappz-todo-add-button",
    type: "submit",
  });
  const formId = builder.addBlock("form", classIds.form, [inputId, addButtonId], {
    attr: { id: "flowappz-todo-form" },
  });

  const taskItemIds = tasks.map((task, index) =>
    createTaskNodes(builder, classIds, task, index),
  );
  const listId = builder.addBlock("motion.div", classIds.list, taskItemIds, {
    attr: { id: "flowappz-todo-list" },
  });
  const emptyId = builder.addTextBlock("motion.div", classIds.empty, "No tasks yet.", {
    attr: { id: "flowappz-todo-empty" },
  });

  const rootId = builder.addBlock(
    "motion.div",
    classIds.root,
    [headerId, formId, listId, emptyId],
    {
      attr: { id: "flowappz-todo-root" },
      xattr: [
        { name: "flowappz-todo-list-id", value: todoListId },
        { name: "flowappz-todo-theme", value: settings.theme },
        { name: "flowappz-todo-allow-add", value: String(settings.allowAdd) },
        { name: "flowappz-todo-allow-edit", value: String(settings.allowEdit) },
        {
          name: "flowappz-todo-allow-delete",
          value: String(settings.allowDelete),
        },
        {
          name: "flowappz-todo-show-completed",
          value: String(settings.showCompleted),
        },
        {
          name: "flowappz-todo-persist",
          value: String(settings.persistInBrowser),
        },
      ],
    },
  );

  // Webflow paste uses the first node as the pasted root.
  const rootIndex = builder.nodes.findIndex(
    (node) => "_id" in node && node._id === rootId,
  );
  if (rootIndex > 0) {
    const rootNode = builder.nodes[rootIndex];
    builder.nodes.splice(rootIndex, 1);
    builder.nodes.unshift(rootNode);
  }

  return {
    type: "@webflow/XscpData",
    payload: {
      nodes: builder.nodes,
      styles: builder.styles,
      assets: [],
      ix1: [],
      ix2: { interactions: [], events: [], actionLists: [] },
    },
    meta: {
      unlinkedSymbolCount: 0,
      droppedLinks: 0,
      dynBindRemovedCount: 0,
      dynListBindRemovedCount: 0,
      paginationRemovedCount: 0,
    },
  };
}


