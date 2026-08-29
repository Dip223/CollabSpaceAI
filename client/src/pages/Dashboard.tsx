import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Link2,
  Boxes,
  ArrowRight,
  Copy,
  Check,
  BadgeCheck,
  ShieldAlert,
  Calendar,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

import api from "../services/api";
import {
  createWorkspace,
  joinWorkspace,
  getMyWorkspaces,
  leaveWorkspace as leaveWorkspaceApi,
} from "../services/serverApi";

interface User {
  id: number;
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

interface Workspace {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
}

const initials = (name?: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// A pool of 20 statically-written class-string sets — Tailwind's build-time
// scanner needs to see full literal class names somewhere in the source to
// generate the matching CSS, so these can't be built by interpolating a
// color name into a template string at runtime.
const WORKSPACE_COLOR_POOL = [
  { chip: "bg-red-500/15", icon: "text-red-400", btn: "bg-red-600 group-hover:bg-red-500" },
  { chip: "bg-orange-500/15", icon: "text-orange-400", btn: "bg-orange-600 group-hover:bg-orange-500" },
  { chip: "bg-amber-500/15", icon: "text-amber-400", btn: "bg-amber-600 group-hover:bg-amber-500" },
  { chip: "bg-yellow-500/15", icon: "text-yellow-400", btn: "bg-yellow-600 group-hover:bg-yellow-500" },
  { chip: "bg-lime-500/15", icon: "text-lime-400", btn: "bg-lime-600 group-hover:bg-lime-500" },
  { chip: "bg-green-500/15", icon: "text-green-400", btn: "bg-green-600 group-hover:bg-green-500" },
  { chip: "bg-emerald-500/15", icon: "text-emerald-400", btn: "bg-emerald-600 group-hover:bg-emerald-500" },
  { chip: "bg-teal-500/15", icon: "text-teal-400", btn: "bg-teal-600 group-hover:bg-teal-500" },
  { chip: "bg-cyan-500/15", icon: "text-cyan-400", btn: "bg-cyan-600 group-hover:bg-cyan-500" },
  { chip: "bg-sky-500/15", icon: "text-sky-400", btn: "bg-sky-600 group-hover:bg-sky-500" },
  { chip: "bg-blue-500/15", icon: "text-blue-400", btn: "bg-blue-600 group-hover:bg-blue-500" },
  { chip: "bg-indigo-500/15", icon: "text-indigo-400", btn: "bg-indigo-600 group-hover:bg-indigo-500" },
  { chip: "bg-violet-500/15", icon: "text-violet-400", btn: "bg-violet-600 group-hover:bg-violet-500" },
  { chip: "bg-purple-500/15", icon: "text-purple-400", btn: "bg-purple-600 group-hover:bg-purple-500" },
  { chip: "bg-fuchsia-500/15", icon: "text-fuchsia-400", btn: "bg-fuchsia-600 group-hover:bg-fuchsia-500" },
  { chip: "bg-pink-500/15", icon: "text-pink-400", btn: "bg-pink-600 group-hover:bg-pink-500" },
  { chip: "bg-rose-500/15", icon: "text-rose-400", btn: "bg-rose-600 group-hover:bg-rose-500" },
  { chip: "bg-slate-500/15", icon: "text-slate-400", btn: "bg-slate-600 group-hover:bg-slate-500" },
  { chip: "bg-zinc-500/15", icon: "text-zinc-400", btn: "bg-zinc-600 group-hover:bg-zinc-500" },
  { chip: "bg-stone-500/15", icon: "text-stone-400", btn: "bg-stone-600 group-hover:bg-stone-500" },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);

  const createSectionRef = useRef<HTMLDivElement>(null);
  const workspaceNameInputRef = useRef<HTMLInputElement>(null);
  const myWorkspacesSectionRef = useRef<HTMLDivElement>(null);

  // Shuffled once per page load, then stable for the session — a given
  // workspace keeps the same color as you create/delete/toggle "see all",
  // rather than everything reshuffling on every action.
  const shuffledColors = useMemo(() => shuffle(WORKSPACE_COLOR_POOL), []);

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(workspaceSearch.trim().toLowerCase())
  );
  const visibleWorkspaces = showAllWorkspaces
    ? filteredWorkspaces
    : filteredWorkspaces.slice(0, 3);

  const handleSidebarCreateClick = () => {
    createSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    workspaceNameInputRef.current?.focus();
  };

  const handleSidebarWorkspacesClick = () => {
    myWorkspacesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const userRes = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(userRes.data);

      const serverRes = await getMyWorkspaces();

      setWorkspaces(serverRes.data.servers);
    } catch (err) {
      localStorage.removeItem("token");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!workspaceName.trim()) return;

    try {
      await createWorkspace(workspaceName);

      setWorkspaceName("");

      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;

    try {
      await joinWorkspace(inviteCode);

      setInviteCode("");

      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleCopyInvite = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteWorkspace = async (workspace: Workspace) => {
    const isOwner = workspace.ownerId === user?.id;
    const warning = isOwner
      ? `Delete "${workspace.name}"? Since you're the admin, if other members remain, whoever joined earliest becomes the new admin. If you're the only member, the workspace and everything in it is deleted permanently.`
      : `Leave "${workspace.name}"? You'll need a new invite code to rejoin.`;

    if (!confirm(warning)) return;

    try {
      await leaveWorkspaceApi(workspace.id);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Couldn't delete that workspace.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        workspaceCount={workspaces.length}
        onCreateClick={handleSidebarCreateClick}
        onWorkspacesClick={handleSidebarWorkspacesClick}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={user} onLogout={handleLogout} onSearchChange={setWorkspaceSearch} />

        <main className="flex-1 overflow-auto bg-background">
          <div className="max-w-6xl mx-auto p-6 lg:p-8">
            {/* Welcome header */}
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                Welcome back, {user?.name?.split(" ")[0]}
              </h1>
              <p className="mt-1 text-muted-foreground text-sm">
                AI-powered collaborative workspace — pick up where you left off.
              </p>
            </div>

            {/* Row 1: Profile / Workspace count / Joined date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initials(user?.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-semibold text-sm truncate">
                    {user?.name}
                  </p>
                  <p
                    className={`text-xs flex items-center gap-1 ${
                      user?.isVerified ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {user?.isVerified ? (
                      <BadgeCheck size={12} />
                    ) : (
                      <ShieldAlert size={12} />
                    )}
                    {user?.isVerified ? "Verified" : "Unverified"}
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-5 flex items-center gap-4">
                <span className="h-11 w-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <Boxes size={20} className="text-indigo-400" />
                </span>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-tight">
                    {workspaces.length}
                  </p>
                  <p className="text-muted-foreground text-xs">Workspaces</p>
                </div>
              </div>

              <div className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-5 flex items-center gap-4">
                <span className="h-11 w-11 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                  <Calendar size={20} className="text-cyan-400" />
                </span>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-tight">
                    {user &&
                      new Date(user.createdAt).toLocaleDateString([], {
                        month: "short",
                        year: "numeric",
                      })}
                  </p>
                  <p className="text-muted-foreground text-xs">Member since</p>
                </div>
              </div>
            </div>

            {/* Row 2: Create / Join / Smart Forms */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              <div
                ref={createSectionRef}
                className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-6 flex flex-col"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                    <Plus size={16} className="text-indigo-400" />
                  </span>
                  <h2 className="text-foreground font-semibold">Create a Workspace</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Spin up a new space for your team to collaborate.
                </p>

                <input
                  ref={workspaceNameInputRef}
                  className="w-full rounded-xl bg-muted px-4 py-3 text-foreground text-sm outline-none ring-1 ring-transparent focus:ring-indigo-500 transition-shadow placeholder:text-muted-foreground"
                  placeholder="Workspace name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />

                <button
                  onClick={handleCreate}
                  disabled={!workspaceName.trim()}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors px-6 py-2.5 text-white text-sm font-medium"
                >
                  <Plus size={15} />
                  Create Workspace
                </button>
              </div>

              <div className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-6 flex flex-col">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Link2 size={16} className="text-emerald-400" />
                  </span>
                  <h2 className="text-foreground font-semibold">Join a Workspace</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Enter an invite code to join an existing team.
                </p>

                <input
                  className="w-full rounded-xl bg-muted px-4 py-3 text-foreground text-sm outline-none ring-1 ring-transparent focus:ring-emerald-500 transition-shadow placeholder:text-muted-foreground"
                  placeholder="Invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />

                <button
                  onClick={handleJoin}
                  disabled={!inviteCode.trim()}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors px-6 py-2.5 text-white text-sm font-medium"
                >
                  <Link2 size={15} />
                  Join Workspace
                </button>
              </div>

              <div className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-6 flex flex-col">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                    <Sparkles size={16} className="text-indigo-400" />
                  </span>
                  <h2 className="text-foreground font-semibold">Smart Forms</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Fill forms from PDF/image documents or use voice input.
                </p>

                <button
                  onClick={() => navigate("/smart-forms")}
                  className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors px-6 py-2.5 text-white text-sm font-medium"
                >
                  <Sparkles size={15} />
                  Open Smart Forms
                </button>
              </div>
            </div>

            {/* My Workspaces */}
            <div ref={myWorkspacesSectionRef} className="mb-6 scroll-mt-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <Boxes size={16} className="text-indigo-400" />
                </span>
                <h2 className="text-xl font-bold text-foreground">My Workspaces</h2>
                {workspaceSearch.trim() && (
                  <span className="text-sm text-muted-foreground">
                    {filteredWorkspaces.length} of {workspaces.length}
                  </span>
                )}

                {!workspaceSearch.trim() && filteredWorkspaces.length > 3 && (
                  <button
                    onClick={() => setShowAllWorkspaces((v) => !v)}
                    className="ml-auto flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    {showAllWorkspaces ? "Show less" : "See all"}
                    {showAllWorkspaces ? (
                      <ChevronUp size={15} />
                    ) : (
                      <ChevronDown size={15} />
                    )}
                  </button>
                )}
              </div>

              {workspaces.length === 0 ? (
                <div className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-10 flex flex-col items-center justify-center text-center gap-2">
                  <Boxes size={28} className="text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No workspaces yet — create one or join with an invite code.
                  </p>
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <div className="bg-card rounded-2xl ring-1 ring-border shadow-lg shadow-black/10 p-10 flex flex-col items-center justify-center text-center gap-2">
                  <Boxes size={28} className="text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No workspaces match "{workspaceSearch}".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleWorkspaces.map((workspace) => {
                    const colorIndex = filteredWorkspaces.findIndex(
                      (w) => w.id === workspace.id
                    );
                    const color =
                      shuffledColors[colorIndex % shuffledColors.length];

                    return (
                      <div
                        key={workspace.id}
                        className="group bg-card rounded-2xl ring-1 ring-border hover:ring-indigo-500/40 shadow-lg shadow-black/10 hover:shadow-xl transition-all p-5 flex flex-col"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`h-11 w-11 rounded-xl ${color.chip} flex items-center justify-center shrink-0`}
                          >
                            <Boxes size={18} className={color.icon} />
                          </span>
                          {workspace.ownerId === user?.id && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                              Owner
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3.5 text-foreground font-semibold text-lg truncate">
                          {workspace.name}
                        </h3>

                        <button
                          onClick={() =>
                            handleCopyInvite(workspace.inviteCode, workspace.id)
                          }
                          className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
                        >
                          <span className="font-mono text-indigo-400">
                            {workspace.inviteCode}
                          </span>
                          {copiedId === workspace.id ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} className="opacity-60" />
                          )}
                        </button>

                        <div className="mt-5 flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/workspace/${workspace.id}`)}
                            className={`flex-1 flex items-center justify-center gap-1.5 ${color.btn} transition-colors text-white text-sm font-medium py-2.5 rounded-xl`}
                          >
                            Open Workspace
                            <ArrowRight
                              size={14}
                              className="transition-transform group-hover:translate-x-0.5"
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteWorkspace(workspace)}
                            title={
                              workspace.ownerId === user?.id
                                ? "Delete workspace"
                                : "Leave workspace"
                            }
                            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl ring-1 ring-border text-muted-foreground hover:text-red-400 hover:ring-red-500/40 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
