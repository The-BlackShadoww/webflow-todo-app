import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { TodoTask } from "@/types";

function makeTask(text: string): TodoTask {
  return { id: `task-${Date.now()}`, text, completed: false };
}

export default function TasksView() {
  const { settings, saveSettings } = useAppContext();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const updateTasks = async (initialTasks: TodoTask[]) => {
    setSaving(true);
    await saveSettings({ ...settings, initialTasks });
    setSaving(false);
  };

  const addTask = async () => {
    const text = draft.trim();
    if (!text) return;
    await updateTasks([...settings.initialTasks, makeTask(text)]);
    setDraft("");
  };

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
      <div>
        <h1 className="text-[18px] font-bold text-white">Starter Tasks</h1>
        <p className="mt-1 text-[13px] text-white/50">
          These tasks will be included in the pasted Webflow element.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && addTask()}
          placeholder="Add a task"
          className="h-10 flex-1 rounded-md border border-white/10 bg-[#292929] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#006acc]"
        />
        <button
          onClick={addTask}
          className="flex h-10 items-center gap-2 rounded-md bg-[#006acc] px-3 text-[13px] font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {settings.initialTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={(event) =>
                updateTasks(
                  settings.initialTasks.map((item) =>
                    item.id === task.id
                      ? { ...item, completed: event.target.checked }
                      : item,
                  ),
                )
              }
              className="h-4 w-4 accent-[#006acc]"
            />
            <input
              value={task.text}
              onChange={(event) =>
                updateTasks(
                  settings.initialTasks.map((item) =>
                    item.id === task.id
                      ? { ...item, text: event.target.value }
                      : item,
                  ),
                )
              }
              className="h-8 flex-1 bg-transparent text-[13px] text-white outline-none"
            />
            <button
              onClick={() =>
                updateTasks(
                  settings.initialTasks.filter((item) => item.id !== task.id),
                )
              }
              className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-white/35">
        {saving
          ? "Saving..."
          : "Changes are saved to the backend for this Webflow site."}
      </p>
    </section>
  );
}
