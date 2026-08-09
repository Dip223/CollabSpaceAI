import {
  Home,
  Plus,
  Users,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside>

      <span className="w-8 h-px bg-border" />

      <button
        title="Create"
        className="w-12 h-12 rounded-2xl bg-card ring-1 ring-border flex items-center justify-center hover:bg-indigo-600 hover:ring-0 transition-all"
      >
        <Plus
          size={20}
          className="text-muted-foreground hover:text-white"
        />
      </button>

      <button
        title="Members"
        className="w-12 h-12 rounded-2xl bg-card ring-1 ring-border flex items-center justify-center hover:bg-indigo-600 hover:ring-0 transition-all"
      >
        <Users
          size={20}
          className="text-muted-foreground hover:text-white"
        />
      </button>

    </aside>
  );
}