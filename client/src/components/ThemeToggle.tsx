import { Moon, Sun } from "lucide-react";

import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
    >
      {isDark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}