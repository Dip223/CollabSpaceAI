import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, FileText, MessageSquare, Upload } from "lucide-react";

import ThemeToggle from "../components/ThemeToggle";
import EmptyState from "../components/common/EmptyState";
import {
  getNotifications,
  markAllRead,
} from "../services/notificationApi";

interface NotificationItem {
  id: number;
  type: "NOTE_EDIT" | "MESSAGE" | "FILE_SHARE";
  actorName: string;
  serverName: string;
  serverId: number;
  read: boolean;
  createdAt: string;
}

const describe = (n: NotificationItem) => {
  if (n.type === "NOTE_EDIT") {
    return (
      <>
        <span className="font-semibold text-foreground">{n.actorName}</span>{" "}
        has edited in{" "}
        <span className="font-semibold text-foreground">{n.serverName}</span>
      </>
    );
  }
  if (n.type === "MESSAGE") {
    return (
      <>
        <span className="font-semibold text-foreground">{n.actorName}</span>{" "}
        has sent a message in{" "}
        <span className="font-semibold text-foreground">{n.serverName}</span>
      </>
    );
  }
  return (
    <>
      <span className="font-semibold text-foreground">{n.actorName}</span>{" "}
      has shared a file in{" "}
      <span className="font-semibold text-foreground">{n.serverName}</span>
    </>
  );
};

const iconFor = (type: NotificationItem["type"]) => {
  if (type === "NOTE_EDIT") return <FileText size={16} className="text-indigo-400" />;
  if (type === "MESSAGE") return <MessageSquare size={16} className="text-emerald-400" />;
  return <Upload size={16} className="text-cyan-400" />;
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getNotifications();
        // Capture read/unread state from BEFORE marking as read, so the
        // person can still see what's new on this visit rather than
        // everything instantly looking "seen".
        setNotifications(res.notifications || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }

      // Marks them read for next time (e.g. the topbar badge count) —
      // doesn't affect what's already rendered above.
      markAllRead().catch((err) => console.log(err));
    })();
  }, []);

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
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="You'll see updates here when something happens in a workspace while you're not in it — a document edit, a new message, or a shared file."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate(`/workspace/${n.serverId}`)}
                className={`flex items-start gap-3 text-left p-4 rounded-xl ring-1 transition-colors ${
                  n.read
                    ? "bg-card ring-border hover:bg-accent"
                    : "bg-indigo-500/5 ring-indigo-500/30 hover:bg-indigo-500/10"
                }`}
              >
                <span className="h-9 w-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                  {iconFor(n.type)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {describe(n)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}