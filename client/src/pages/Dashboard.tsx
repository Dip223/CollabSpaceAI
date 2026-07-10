import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import api from "../services/api";

interface User {
  id: number;
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(res.data);

      } catch (error) {
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1f22] text-white text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1e1f22]">

      <Sidebar />

      <div className="flex flex-col flex-1">

        <Topbar />

        <main className="flex-1 bg-[#313338] p-8 overflow-auto">

          <h1 className="text-4xl font-bold text-white">
            Welcome, {user?.name} 👋
          </h1>

          <p className="mt-3 text-gray-400">
            AI Powered Collaborative Workspace
          </p>

          <div className="mt-8 bg-[#2b2d31] rounded-xl p-6 border border-[#404249] max-w-xl">

            <h2 className="text-2xl font-semibold text-white mb-5">
              Profile
            </h2>

            <div className="space-y-4">

              <div>
                <p className="text-gray-400 text-sm">
                  Name
                </p>

                <p className="text-white">
                  {user?.name}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Email
                </p>

                <p className="text-white">
                  {user?.email}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Verified
                </p>

                <p
                  className={
                    user?.isVerified
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {user?.isVerified ? "Yes ✅" : "No ❌"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">
                  Joined
                </p>

                <p className="text-white">
                  {user &&
                    new Date(
                      user.createdAt
                    ).toLocaleDateString()}
                </p>
              </div>

            </div>

            <button
              onClick={handleLogout}
              className="mt-8 bg-red-600 hover:bg-red-700 transition px-5 py-2 rounded-lg text-white"
            >
              Logout
            </button>

          </div>

        </main>

      </div>

    </div>
  );
}