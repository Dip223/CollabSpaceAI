import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);

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

      alert("Workspace Created Successfully!");
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

      alert("Joined Successfully!");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-[#1e1f22] text-white text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1e1f22]">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Topbar />

        <main className="flex-1 overflow-auto bg-[#313338] p-8">

          <h1 className="text-4xl font-bold text-white">
            Welcome {user?.name} 👋
          </h1>

          <p className="mt-2 text-gray-400">
            AI Powered Collaborative Workspace
          </p>

          {/* Create Workspace */}

          <div className="mt-8 rounded-xl bg-[#2b2d31] p-6">

            <h2 className="text-xl font-bold text-white">
              Create Workspace
            </h2>

            <input
              className="mt-4 w-full rounded bg-[#1e1f22] p-3 text-white outline-none"
              placeholder="Workspace Name"
              value={workspaceName}
              onChange={(e) =>
                setWorkspaceName(e.target.value)
              }
            />

            <button
              onClick={handleCreate}
              className="mt-4 rounded bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700"
            >
              Create Workspace
            </button>

          </div>

          {/* Join Workspace */}

          <div className="mt-6 rounded-xl bg-[#2b2d31] p-6">

            <h2 className="text-xl font-bold text-white">
              Join Workspace
            </h2>

            <input
              className="mt-4 w-full rounded bg-[#1e1f22] p-3 text-white outline-none"
              placeholder="Invite Code"
              value={inviteCode}
              onChange={(e) =>
                setInviteCode(e.target.value)
              }
            />

            <button
              onClick={handleJoin}
              className="mt-4 rounded bg-green-600 px-6 py-2 text-white hover:bg-green-700"
            >
              Join Workspace
            </button>

          </div>

          {/* Workspace List */}

          <div className="mt-8 rounded-xl bg-[#2b2d31] p-6">

            <h2 className="mb-4 text-xl font-bold text-white">
              My Workspaces
            </h2>

            {workspaces.length === 0 ? (
              <p className="text-gray-400">
                No Workspace Found
              </p>
            ) : (
              <div className="space-y-4">

                {workspaces.map((workspace) => (

                  <div
                    key={workspace.id}
                    className="rounded-lg border border-[#404249] bg-[#1e1f22] p-5"
                  >

                    <h3 className="text-xl font-semibold text-white">
                      {workspace.name}
                    </h3>

                    <p className="mt-2 text-gray-400">
                      Invite Code :
                      <span className="ml-2 font-semibold text-indigo-400">
                        {workspace.inviteCode}
                      </span>
                    </p>

                    <div className="mt-4 flex gap-3">

                      <button
                        onClick={() =>
                          navigate(`/workspace/${workspace.id}`)
                        }
                        className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                      >
                        Open Workspace
                      </button>

                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            workspace.inviteCode
                          )
                        }
                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      >
                        Copy Invite Code
                      </button>

                    </div>

                  </div>

                ))}

              </div>
            )}

          </div>

          {/* Profile */}

          <div className="mt-8 max-w-xl rounded-xl bg-[#2b2d31] p-6">

            <h2 className="text-2xl font-bold text-white">
              Profile
            </h2>

            <div className="mt-5 space-y-3">

              <p className="text-white">
                <b>Name:</b> {user?.name}
              </p>

              <p className="text-white">
                <b>Email:</b> {user?.email}
              </p>

              <p className="text-white">
                <b>Verified:</b>{" "}
                {user?.isVerified ? "✅ Yes" : "❌ No"}
              </p>

              <p className="text-white">
                <b>Joined:</b>{" "}
                {user &&
                  new Date(
                    user.createdAt
                  ).toLocaleDateString()}
              </p>

            </div>

            <button
              onClick={handleLogout}
              className="mt-6 rounded bg-red-600 px-6 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>

          </div>

        </main>
      </div>
    </div>
  );
}