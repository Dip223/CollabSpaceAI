import {
  Bell,
  Search,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";

import { useTheme } from "./theme-provider";

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
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <header
      className={`
        h-[76px]
        w-full
        flex
        items-center
        justify-between
        px-8
        border-b
        transition-colors
        duration-200

        ${
          isDark
            ? "bg-[#1f2024] border-white/5"
            : "bg-white border-gray-200"
        }
      `}
    >
      {/* Logo / Title */}
      <div>
        <h1
          className={`
            text-xl
            font-bold
            transition-colors
            duration-200

            ${
              isDark
                ? "text-white"
                : "text-gray-900"
            }
          `}
        >
          CollabSpace{" "}
          <span className="text-indigo-500">
            AI
          </span>
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 lg:gap-5">

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={
            isDark
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          className={`
            transition-colors
            duration-200

            ${
              isDark
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }
          `}
        >
          {isDark ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>

        {/* Search */}
        <button
          type="button"
          className={`
            hidden
            sm:block
            transition-colors
            duration-200

            ${
              isDark
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }
          `}
        >
          <Search size={19} />
        </button>

        {/* Notifications */}
        <button
          type="button"
          className={`
            transition-colors
            duration-200

            ${
              isDark
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }
          `}
        >
          <Bell size={19} />
        </button>

        {/* Divider */}
        <span
          className={`
            w-px
            h-6

            ${
              isDark
                ? "bg-white/10"
                : "bg-gray-200"
            }
          `}
        />

        {/* User */}
        <div className="flex items-center gap-2.5 min-w-0">

          {/* Avatar */}
          <div
            className="
              h-9
              w-9
              rounded-full
              bg-indigo-600
              flex
              items-center
              justify-center
              text-white
              text-xs
              font-bold
              shrink-0
            "
          >
            {initials(user?.name)}
          </div>

          {/* User information */}
          <div className="hidden sm:block leading-tight min-w-0">

            <p
              className={`
                text-sm
                font-medium
                truncate
                max-w-[140px]
                transition-colors
                duration-200

                ${
                  isDark
                    ? "text-white"
                    : "text-gray-900"
                }
              `}
            >
              {user?.name || "..."}
            </p>

            <p
              className={`
                text-xs
                truncate
                max-w-[140px]
                transition-colors
                duration-200

                ${
                  isDark
                    ? "text-gray-500"
                    : "text-gray-500"
                }
              `}
            >
              {user?.email}
            </p>

          </div>
        </div>

        {/* Logout */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            className={`
              transition-colors
              duration-200
              shrink-0

              ${
                isDark
                  ? "text-gray-400 hover:text-red-400"
                  : "text-gray-500 hover:text-red-500"
              }
            `}
          >
            <LogOut size={18} />
          </button>
        )}

      </div>
    </header>
  );
}