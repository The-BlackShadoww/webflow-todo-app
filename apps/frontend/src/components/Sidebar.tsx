import {
  ClipboardList,
  Home,
  ListChecks,
  LogOut,
  Settings,
  Copy,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

const iconClass = "h-4 w-4";

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Home", icon: <Home className={iconClass} /> },
  { id: "tasks", label: "Tasks", icon: <ListChecks className={iconClass} /> },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className={iconClass} />,
  },
  { id: "copy", label: "Copy", icon: <Copy className={iconClass} /> },
];

export function Sidebar({
  activeId,
  onSelect,
  onLogout,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="flex h-screen w-[82px] shrink-0 flex-col border-r border-white/10 bg-[#181818] px-2 py-3">
      <div className="mb-4 flex h-10 w-full items-center justify-center rounded-md bg-[#006acc] text-white">
        <ClipboardList className="h-5 w-5" />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[10px] font-medium transition-colors ${activeId === item.id ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/5 hover:text-white/80"}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button
        onClick={onLogout}
        className="flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[10px] font-medium text-white/45 hover:bg-white/5 hover:text-white/80"
      >
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </aside>
  );
}
