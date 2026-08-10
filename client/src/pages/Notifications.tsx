import { Link } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";

import ThemeToggle from "../components/ThemeToggle";
import EmptyState from "../components/common/EmptyState";

export default function Notifications() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-r from-card to-background px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              title="Back to dashboard"
              className="h-9 w-9 rounded-xl bg-background ring-1 ring-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              <ArrowLeft size={17} />
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Bell size={16} className="text-indigo-400" />
              </span>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Notifications
              </h1>
            </div>
          </div>

          <ThemeToggle className="h-9 w-9 rounded-xl bg-background ring-1 ring-border flex items-center justify-center hover:bg-accent transition-colors" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <EmptyState
          title="No notifications yet"
          description="Workspace invites, mentions, and activity will show up here once they happen."
        />
      </div>
    </div>
  );
}
