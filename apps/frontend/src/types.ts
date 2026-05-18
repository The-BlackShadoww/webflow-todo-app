export type TodoTask = {
  id: string;
  text: string;
  completed: boolean;
};

export type TodoSettings = {
  allowAdd: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  showCompleted: boolean;
  persistInBrowser: boolean;
  theme: "light" | "dark" | "system";
  initialTasks: TodoTask[];
};

export type WebflowSite = {
  siteId: string;
  displayName?: string;
  previewUrl?: string | null;
};
