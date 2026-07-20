import { Bell, Search, LogOut } from "lucide-react";

interface TopbarUser {
  name?: string;
  email?: string;
}

interface TopbarProps {
  user?: TopbarUser | null;
  onLogout?: () => void;
}

const initials = (name?: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export default function Topbar({ user, onLogout }: TopbarProps) {
  return (
    <header className="h-16 border-b border-white/5 bg-gradient-to-r from-[#232428] via-[#1e1f22] to-[#1e1f22] px-5 lg:px-8 flex items-center justify-between shrink-0">
      <h2 className="text-white text-lg font-bold tracking-tight">
        CollabSpace <span className="text-indigo-400">AI</span>
      </h2>

      <div className="flex items-center gap-4 lg:gap-5">
        <button className="text-gray-400 hover:text-white transition-colors hidden sm:block">
          <Search size={19} />
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <Bell size={19} />
        </button>

        <span className="w-px h-6 bg-white/10" />

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials(user?.name)}
          </div>
          <div className="hidden sm:block leading-tight min-w-0">
            <p className="text-white text-sm font-medium truncate max-w-[140px]">
              {user?.name || "..."}
            </p>
            <p className="text-gray-500 text-xs truncate max-w-[140px]">
              {user?.email}
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Log out"
            className="text-gray-400 hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}