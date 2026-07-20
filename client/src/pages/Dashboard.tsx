import { useEffect, useState } from "react";
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
  UserRound,
} from "lucide-react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

import api from "../services/api";
import {
  createWorkspace,
  joinWorkspace,
  getMyWorkspaces,
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

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

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

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-[#1e1f22]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1e1f22]">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={user} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto bg-[#313338]">
          <div className="max-w-6xl mx-auto p-6 lg:p-10">
            {/* Welcome header */}
            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Welcome back, {user?.name?.split(" ")[0]}
              </h1>
              <p className="mt-2 text-gray-400">
                AI-powered collaborative workspace — pick up where you left off.
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-lg shadow-black/10 p-5 flex items-center gap-4">
                <span className="h-11 w-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <Boxes size={20} className="text-indigo-400" />
                </span>
                <div>
                  <p className="text-2xl font-bold text-white leading-tight">
                    {workspaces.length}
                  </p>
                  <p className="text-gray-500 text-xs">Workspaces</p>
                </div>
              </div>

              <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-lg shadow-black/10 p-5 flex items-center gap-4">
                <span
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    user?.isVerified ? "bg-emerald-500/15" : "bg-amber-500/15"
                  }`}
                >
                  {user?.isVerified ? (
                    <BadgeCheck size={20} className="text-emerald-400" />
                  ) : (
                    <ShieldAlert size={20} className="text-amber-400" />
                  )}
                </span>
                <div>
                  <p className="text-2xl font-bold text-white leading-tight">
                    {user?.isVerified ? "Verified" : "Unverified"}
                  </p>
                  <p className="text-gray-500 text-xs">Account status</p>
                </div>
              </div>

              <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-lg shadow-black/10 p-5 flex items-center gap-4">
                <span className="h-11 w-11 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                  <Calendar size={20} className="text-cyan-400" />
                </span>
                <div>
                  <p className="text-2xl font-bold text-white leading-tight">
                    {user &&
                      new Date(user.createdAt).toLocaleDateString([], {
                        month: "short",
                        year: "numeric",
                      })}
                  </p>
                  <p className="text-gray-500 text-xs">Member since</p>
                </div>
              </div>
            </div>

            {/* Create + Join */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
              <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-lg shadow-black/10 p-6 flex flex-col">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                    <Plus size={16} className="text-indigo-400" />
                  </span>
                  <h2 className="text-white font-semibold">Create a Workspace</h2>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                  Spin up a new space for your team to collaborate.
                </p>

                <input
                  className="w-full rounded-xl bg-[#1e1f22] px-4 py-3 text-white text-sm outline-none ring-1 ring-transparent focus:ring-indigo-500 transition-shadow placeholder:text-gray-500"
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

              <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-lg shadow-black/10 p-6 flex flex-col">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Link2 size={16} className="text-emerald-400" />
                  </span>
                  <h2 className="text-white font-semibold">Join a Workspace</h2>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                  Enter an invite code to join an existing team.
                </p>

                <input
                  className="w-full rounded-xl bg-[#1e1f22] px-4 py-3 text-white text-sm outline-none ring-1 ring-transparent focus:ring-emerald-500 transition-shadow placeholder:text-gray-500"
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
            </div>

            {/* My Workspaces */}
            <div className="mb-8">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <Boxes size={16} className="text-indigo-400" />
                </span>
                <h2 className="text-xl font-bold text-white">My Workspaces</h2>
              </div>

              {workspaces.length === 0 ? (
                <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-lg shadow-black/10 p-10 flex flex-col items-center justify-center text-center gap-2">
                  <Boxes size={28} className="text-gray-600" />
                  <p className="text-gray-400 text-sm">
                    No workspaces yet — create one or join with an invite code.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="group bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 hover:ring-indigo-500/40 shadow-lg shadow-black/10 hover:shadow-xl transition-all p-5 flex flex-col"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="h-11 w-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                          <Boxes size={18} className="text-indigo-400" />
                        </span>
                        {workspace.ownerId === user?.id && (
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                            Owner
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3.5 text-white font-semibold text-lg truncate">
                        {workspace.name}
                      </h3>

                      <button
                        onClick={() =>
                          handleCopyInvite(workspace.inviteCode, workspace.id)
                        }
                        className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-300 w-fit"
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

                      <button
                        onClick={() => navigate(`/workspace/${workspace.id}`)}
                        className="mt-5 w-full flex items-center justify-center gap-1.5 bg-indigo-600 group-hover:bg-indigo-500 transition-colors text-white text-sm font-medium py-2.5 rounded-xl"
                      >
                        Open Workspace
                        <ArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-lg shadow-black/10 p-6 max-w-xl mb-6">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <UserRound size={16} className="text-indigo-400" />
                </span>
                <h2 className="text-white font-semibold text-lg">Profile</h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {initials(user?.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{user?.name}</p>
                  <p className="text-gray-500 text-sm truncate">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/5">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <p
                    className={`text-sm font-medium flex items-center gap-1.5 ${
                      user?.isVerified ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {user?.isVerified ? (
                      <BadgeCheck size={14} />
                    ) : (
                      <ShieldAlert size={14} />
                    )}
                    {user?.isVerified ? "Verified" : "Unverified"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Joined</p>
                  <p className="text-white text-sm font-medium">
                    {user &&
                      new Date(user.createdAt).toLocaleDateString([], {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}