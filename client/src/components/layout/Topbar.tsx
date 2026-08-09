import ThemeToggle from "../ThemeToggle";
import {
  Bell,
  Search,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";

import { useTheme } from "../theme-provider";

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

export default function Topbar({
  user,
  onLogout,
}: TopbarProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(
      theme === "dark"
        ? "light"
        : "dark"
    );
  };

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-foreground">
          CollabSpace AI
        </h1>
      </div>

      <div className="flex items-center gap-4 lg:gap-5">

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === "dark" ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>

        {/* Search */}
        <button className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
          <Search size={19} />
        </button>

        {/* Notifications */}
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={19} />
        </button>

        <span className="w-px h-6 bg-border" />

        {/* User */}
        <div className="flex items-center gap-2.5 min-w-0">

          <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials(user?.name)}
          </div>

          <div className="hidden sm:block leading-tight min-w-0">

            <p className="text-foreground text-sm font-medium truncate max-w-[140px]">
              {user?.name || "..."}
            </p>

            <p className="text-muted-foreground text-xs truncate max-w-[140px]">
              {user?.email}
            </p>

          </div>
        </div>

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Log out"
            className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut size={18} />
          </button>
        )}

      </div>
    </header>
  );
}