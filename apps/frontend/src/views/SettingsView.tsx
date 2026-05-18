import { useState } from "react";
import { Toggle } from "@/components/Toggle";
import { useAppContext } from "@/contexts/AppContext";
import type { TodoSettings } from "@/types";

export default function SettingsView() {
  const { settings, saveSettings } = useAppContext();
  const [saving, setSaving] = useState(false);

  const update = async (patch: Partial<TodoSettings>) => {
    setSaving(true);
    await saveSettings({ ...settings, ...patch });
    setSaving(false);
  };

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
      <div>
        <h1 className="text-[18px] font-bold text-white">Todo Settings</h1>
        <p className="mt-1 text-[13px] text-white/50">
          These settings are embedded as attributes on the pasted element.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Toggle
          label="Allow adding tasks"
          checked={settings.allowAdd}
          onChange={(checked) => update({ allowAdd: checked })}
          help="Visitors can add new tasks on the published page."
        />
        <Toggle
          label="Allow editing tasks"
          checked={settings.allowEdit}
          onChange={(checked) => update({ allowEdit: checked })}
          help="Visitors can rename tasks after publishing."
        />
        <Toggle
          label="Allow deleting tasks"
          checked={settings.allowDelete}
          onChange={(checked) => update({ allowDelete: checked })}
          help="Visitors can remove tasks from their list."
        />
        <Toggle
          label="Show completed tasks"
          checked={settings.showCompleted}
          onChange={(checked) => update({ showCompleted: checked })}
          help="Completed tasks remain visible instead of being hidden."
        />
        <Toggle
          label="Persist in browser"
          checked={settings.persistInBrowser}
          onChange={(checked) => update({ persistInBrowser: checked })}
          help="The CDN script will save each visitor's list in localStorage."
        />
      </div>

      <label className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="text-[13px] font-semibold text-white">Theme</span>
        <select
          value={settings.theme}
          onChange={(event) =>
            update({ theme: event.target.value as TodoSettings["theme"] })
          }
          className="h-10 rounded-md border border-white/10 bg-[#292929] px-3 text-[13px] text-white outline-none"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <p className="text-[12px] text-white/35">
        {saving ? "Saving..." : "Settings saved for this site."}
      </p>
    </section>
  );
}
