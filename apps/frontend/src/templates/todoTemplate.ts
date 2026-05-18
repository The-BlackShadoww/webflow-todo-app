import type { TodoSettings, TodoTask } from "@/types";

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
  createdBy?: string;
  selector?: null;
};

const ids = {
  section: "todo-section-node",
  root: "todo-root-node",
  header: "todo-header-node",
  title: "todo-title-node",
  form: "todo-form-node",
  input: "todo-input-node",
  addButton: "todo-add-button-node",
  list: "todo-list-node",
  empty: "todo-empty-node",
};

const classes = {
  section: "todo-section-class",
  root: "todo-root-class",
  header: "todo-header-class",
  title: "todo-title-class",
  form: "todo-form-class",
  input: "todo-input-class",
  addButton: "todo-add-button-class",
  list: "todo-list-class",
  item: "todo-item-class",
  checkbox: "todo-checkbox-class",
  text: "todo-text-class",
  deleteButton: "todo-delete-class",
  empty: "todo-empty-class",
};

function textNode(
  id: string,
  classId: string,
  text: string,
  tag = "div",
  attr: Record<string, unknown> = {},
): XscpNode {
  return {
    _id: id,
    type: "Block",
    tag,
    classes: [classId],
    children: [],
    data: {
      text: true,
      tag,
      attr,
      textContent: text,
      displayName: "",
      xattr: [],
      search: { exclude: false },
      visibility: { conditions: [] },
    },
  };
}

function style(_id: string, name: string, styleLess: string): XscpStyle {
  return {
    _id,
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

function createTaskNodes(task: TodoTask, index: number): XscpNode[] {
  const safeId = `todo-task-${index + 1}`;
  const itemId = `${safeId}-item-node`;
  const checkboxId = `${safeId}-checkbox-node`;
  const textId = `${safeId}-text-node`;
  const deleteId = `${safeId}-delete-node`;

  return [
    {
      _id: itemId,
      type: "Block",
      tag: "div",
      classes: [classes.item],
      children: [checkboxId, textId, deleteId],
      data: {
        text: false,
        tag: "div",
        attr: { id: index === 0 ? "flowappz-todo-item-template" : "" },
        xattr: [
          { name: "flowappz-todo-item", value: "true" },
          { name: "flowappz-todo-completed", value: String(task.completed) },
        ],
        search: { exclude: false },
        visibility: { conditions: [] },
      },
    },
    {
      _id: checkboxId,
      type: "Input",
      tag: "input",
      classes: [classes.checkbox],
      children: [],
      data: {
        attr: { type: "checkbox", checked: task.completed, id: "" },
        xattr: [{ name: "flowappz-todo-checkbox", value: "true" }],
        search: { exclude: false },
        visibility: { conditions: [] },
      },
    },
    textNode(textId, classes.text, task.text, "div", {}),
    textNode(deleteId, classes.deleteButton, "Delete", "button", {
      type: "button",
    }),
  ];
}

export function buildTodoWebflowTemplate(settings: TodoSettings) {
  const tasks = settings.initialTasks.length
    ? settings.initialTasks
    : [{ id: "task-empty", text: "New task", completed: false }];
  const taskNodes = tasks.flatMap(createTaskNodes);
  const taskItemIds = taskNodes
    .filter((node) => node._id.endsWith("-item-node"))
    .map((node) => node._id);

  return {
    type: "@webflow/XscpData",
    payload: {
      nodes: [
        {
          _id: ids.section,
          type: "Section",
          tag: "section",
          classes: [classes.section],
          children: [ids.root],
          data: {
            tag: "section",
            attr: { id: "" },
            xattr: [],
            search: { exclude: false },
            visibility: { conditions: [] },
            grid: { type: "section" },
          },
        },
        {
          _id: ids.root,
          type: "Block",
          tag: "div",
          classes: [classes.root],
          children: [ids.header, ids.form, ids.list, ids.empty],
          data: {
            text: false,
            tag: "div",
            attr: { id: "flowappz-todo-root" },
            xattr: [
              { name: "flowappz-todo-theme", value: settings.theme },
              {
                name: "flowappz-todo-allow-add",
                value: String(settings.allowAdd),
              },
              {
                name: "flowappz-todo-allow-edit",
                value: String(settings.allowEdit),
              },
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
            search: { exclude: false },
            visibility: { conditions: [] },
          },
        },
        {
          _id: ids.header,
          type: "Block",
          tag: "div",
          classes: [classes.header],
          children: [ids.title],
          data: {
            text: false,
            tag: "div",
            attr: { id: "" },
            xattr: [],
            search: { exclude: false },
            visibility: { conditions: [] },
          },
        },
        textNode(ids.title, classes.title, "Todo List", "h2"),
        {
          _id: ids.form,
          type: "Block",
          tag: "form",
          classes: [classes.form],
          children: [ids.input, ids.addButton],
          data: {
            text: false,
            tag: "form",
            attr: { id: "flowappz-todo-form" },
            xattr: [],
            search: { exclude: false },
            visibility: { conditions: [] },
          },
        },
        {
          _id: ids.input,
          type: "Input",
          tag: "input",
          classes: [classes.input],
          children: [],
          data: {
            attr: {
              id: "flowappz-todo-input",
              name: "todo",
              placeholder: "Add a task",
              type: "text",
            },
            xattr: [],
            search: { exclude: false },
            visibility: { conditions: [] },
          },
        },
        textNode(ids.addButton, classes.addButton, "Add", "button", {
          id: "flowappz-todo-add-button",
          type: "submit",
        }),
        {
          _id: ids.list,
          type: "Block",
          tag: "div",
          classes: [classes.list],
          children: taskItemIds,
          data: {
            text: false,
            tag: "div",
            attr: { id: "flowappz-todo-list" },
            xattr: [],
            search: { exclude: false },
            visibility: { conditions: [] },
          },
        },
        ...taskNodes,
        textNode(ids.empty, classes.empty, "No tasks yet.", "div", {
          id: "flowappz-todo-empty",
        }),
      ],
      styles: [
        style(
          classes.section,
          "flowappz-todo-section",
          "padding-top: 32px; padding-right: 20px; padding-bottom: 32px; padding-left: 20px;",
        ),
        style(
          classes.root,
          "flowappz-todo-root",
          "max-width: 640px; margin-right: auto; margin-left: auto; padding-top: 24px; padding-right: 24px; padding-bottom: 24px; padding-left: 24px; border: 1px solid hsla(220, 13%, 84%, 1); border-radius: 8px; background-color: hsla(0, 0%, 100%, 1); color: hsla(222, 47%, 11%, 1);",
        ),
        style(
          classes.header,
          "flowappz-todo-header",
          "display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;",
        ),
        style(
          classes.title,
          "flowappz-todo-title",
          "margin-top: 0px; margin-bottom: 0px; font-size: 24px; line-height: 1.25; font-weight: 700;",
        ),
        style(
          classes.form,
          "flowappz-todo-form",
          "display: flex; width: 100%; grid-column-gap: 8px; grid-row-gap: 8px; margin-bottom: 16px;",
        ),
        style(
          classes.input,
          "flowappz-todo-input",
          "width: 100%; min-height: 42px; padding-top: 8px; padding-right: 12px; padding-bottom: 8px; padding-left: 12px; border: 1px solid hsla(220, 13%, 84%, 1); border-radius: 6px;",
        ),
        style(
          classes.addButton,
          "flowappz-todo-add-button",
          "min-height: 42px; padding-right: 16px; padding-left: 16px; border-radius: 6px; background-color: hsla(207, 100%, 40%, 1); color: white; font-weight: 700;",
        ),
        style(
          classes.list,
          "flowappz-todo-list",
          "display: flex; flex-direction: column; grid-column-gap: 8px; grid-row-gap: 8px;",
        ),
        style(
          classes.item,
          "flowappz-todo-item",
          "display: flex; align-items: center; grid-column-gap: 10px; grid-row-gap: 10px; padding-top: 10px; padding-right: 12px; padding-bottom: 10px; padding-left: 12px; border: 1px solid hsla(220, 13%, 91%, 1); border-radius: 6px;",
        ),
        style(
          classes.checkbox,
          "flowappz-todo-checkbox",
          "width: 18px; height: 18px; flex: 0 0 auto;",
        ),
        style(
          classes.text,
          "flowappz-todo-text",
          "flex: 1 1 auto; font-size: 15px; line-height: 1.4;",
        ),
        style(
          classes.deleteButton,
          "flowappz-todo-delete",
          "padding-top: 6px; padding-right: 10px; padding-bottom: 6px; padding-left: 10px; border-radius: 5px; background-color: hsla(0, 84%, 60%, 1); color: white; font-size: 12px;",
        ),
        style(
          classes.empty,
          "flowappz-todo-empty",
          "display: none; padding-top: 12px; color: hsla(220, 9%, 46%, 1); font-size: 14px;",
        ),
      ],
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
