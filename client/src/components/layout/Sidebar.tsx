import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Plus,
  Boxes,
} from "lucide-react";

interface SidebarProps {
  workspaceCount?: number;
  onCreateClick?: () => void;
  onWorkspacesClick?: () => void;
}

export default function Sidebar({
  workspaceCount = 0,
  onCreateClick,
  onWorkspacesClick,
}: SidebarProps) {
  const location = useLocation();
  const isDashboard =
    location.pathname === "/" || location.pathname.startsWith("/dashboard");

  return (
    <aside className="w-20 h-screen shrink-0 flex flex-col items-center gap-3 py-5 bg-card border-r border-border">
      <Link
        to="/dashboard"
        title="Dashboard"
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
          isDashboard
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "bg-background ring-1 ring-border text-muted-foreground hover:bg-indigo-600 hover:text-white hover:ring-0"
        }`}
      >
        <Home size={20} />
      </Link>

      <span className="w-8 h-px bg-border" />

      <button
        type="button"
        title="Create a workspace"
        onClick={onCreateClick}
        className="w-12 h-12 rounded-2xl bg-background ring-1 ring-border flex items-center justify-center hover:bg-indigo-600 hover:ring-0 transition-all"
      >
        <Plus
          size={20}
          className="text-muted-foreground hover:text-white"
        />
      </button>

      <button
        type="button"
        title={`${workspaceCount} workspace${workspaceCount === 1 ? "" : "s"}`}
        onClick={onWorkspacesClick}
        className="relative w-12 h-12 rounded-2xl bg-background ring-1 ring-border flex items-center justify-center hover:bg-indigo-600 hover:ring-0 transition-all"
      >
        <Boxes
          size={20}
          className="text-muted-foreground hover:text-white"
        />
        {workspaceCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
            {workspaceCount > 99 ? "99+" : workspaceCount}
          </span>
        )}
      </button>

    </aside>
  );
}
