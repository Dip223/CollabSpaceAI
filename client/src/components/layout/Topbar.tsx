import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Search,
  X,
  LogOut,
} from "lucide-react";

import ThemeToggle from "../ThemeToggle";
import { getUnreadCount } from "../../services/notificationApi";

interface TopbarUser {
  name?: string;
  email?: string;
}

interface TopbarProps {
  user?: TopbarUser | null;
  onLogout?: () => void;
  onSearchChange?: (value: string) => void;
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
  onSearchChange,
}: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadCount()
      .then((res) => setUnreadCount(res.count || 0))
      .catch((err) => console.log(err));
  }, []);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchValue("");
    onSearchChange?.("");
  };

  return (
    <header className="flex items-center justify-between px-6 lg:px-8 py-4 border-b border-border bg-card/40 shrink-0">
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">
          CollabSpace AI
        </h1>
      </div>

      <div className="flex items-center gap-4 lg:gap-5">

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Search */}
        {searchOpen ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-background ring-1 ring-border rounded-lg pl-3 pr-1.5 py-1.5">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              placeholder="Search workspaces..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-40"
            />
            <button
              type="button"
              onClick={closeSearch}
              title="Close search"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            title="Search workspaces"
            className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            <Search size={19} />
          </button>
        )}

        {/* Notifications */}
        <Link
          to="/notifications"
          title="Notifications"
          className="relative text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

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