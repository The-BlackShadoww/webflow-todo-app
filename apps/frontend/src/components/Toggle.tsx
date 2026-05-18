export function Toggle({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-white">{label}</span>
        {help && (
          <span className="text-[12px] leading-4 text-white/45">{help}</span>
        )}
      </span>
      <input
        className="h-4 w-4 accent-[#006acc]"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
