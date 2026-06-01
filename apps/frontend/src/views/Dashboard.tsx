import { CheckCircle2, ClipboardList } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

export default function Dashboard() {
  const { site, tasks } = useAppContext();
  const completed = tasks.filter((task) => task.completed).length;

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#72b7ff]">
          Todo App
        </p>
        <h1 className="mt-1 text-[20px] font-bold text-white">
          Build and paste a todo list
        </h1>
        <p className="mt-2 max-w-[540px] text-[13px] leading-5 text-white/55">
          Create your starter tasks, choose how visitors can interact with them,
          then copy the element into Webflow Designer.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <ClipboardList className="mb-3 h-5 w-5 text-[#72b7ff]" />
          <p className="text-[12px] text-white/45">Connected site</p>
          <p className="mt-1 truncate text-[14px] font-semibold text-white">
            {site?.displayName || site?.siteId || "Current Webflow site"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <CheckCircle2 className="mb-3 h-5 w-5 text-[#4ade80]" />
          <p className="text-[12px] text-white/45">Starter tasks</p>
          <p className="mt-1 text-[14px] font-semibold text-white">
            {completed}/{tasks.length} completed
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#242424] p-4">
        <h2 className="text-[14px] font-bold text-white">Build order</h2>
        <div className="mt-3 flex flex-col gap-2 text-[13px] text-white/60">
          <p>1. Add the initial tasks for the list.</p>
          <p>2. Configure visitor permissions and persistence.</p>
          <p>3. Copy the todo element and paste it into Webflow Designer.</p>
        </div>
      </div>
    </section>
  );
}
