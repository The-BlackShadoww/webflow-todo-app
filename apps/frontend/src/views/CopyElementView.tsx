import { Check, Clipboard } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { buildTodoWebflowTemplate } from "@/templates/todoTemplate";

export default function CopyElementView() {
  const { settings } = useAppContext();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const templateJson = buildTodoWebflowTemplate(settings);
      const json = JSON.stringify(templateJson);

      // navigator.clipboard.write() with the "web " MIME prefix is required for
      // custom types in Chrome 104+. Webflow Designer's paste handler reads
      // "web application/json" from the async Clipboard API.
      // The legacy document.execCommand("copy") silently fails in extension iframes.
      await navigator.clipboard.write([
        new ClipboardItem({
          "web application/json": new Blob([json], {
            type: "application/json",
          }),
        }),
      ]);

      setCopied(true);
      window._myWebflow.notify({
        type: "Success",
        message: "Todo element copied. Paste it into Webflow Designer.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      console.error(error);
      window._myWebflow.notify({
        type: "Error",
        message: "Could not copy the todo element.",
      });
    }
  };

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
      <div>
        <h1 className="text-[18px] font-bold text-white">Copy Todo Element</h1>
        <p className="mt-1 text-[13px] text-white/50">
          This copies a Webflow-native element payload, not plain HTML.
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#242424] p-4">
        <h2 className="text-[14px] font-bold text-white">Paste steps</h2>
        <ol className="mt-3 flex flex-col gap-2 text-[13px] text-white/60">
          <li>1. Click Copy Todo Element.</li>
          <li>2. Open Webflow Designer.</li>
          <li>
            3. Select the section or container where the list should appear.
          </li>
          <li>4. Press Ctrl+V or Cmd+V.</li>
        </ol>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[12px] text-white/45">Included tasks</p>
        <p className="mt-1 text-[22px] font-bold text-white">
          {settings.initialTasks.length}
        </p>
      </div>

      <button
        onClick={handleCopy}
        className={`flex h-11 items-center justify-center gap-2 rounded-md px-4 text-[13px] font-semibold text-white ${copied ? "bg-green-600" : "bg-[#006acc]"}`}
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Clipboard className="h-4 w-4" />
        )}
        {copied ? "Copied" : "Copy Todo Element"}
      </button>
    </section>
  );
}
