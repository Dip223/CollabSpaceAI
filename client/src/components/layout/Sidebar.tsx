import { Home, Plus, Users } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-20 bg-[#111214] border-r border-white/5 flex flex-col items-center py-5 gap-4 shrink-0">
      <button
        title="Home"
        className="w-12 h-12 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/40 flex items-center justify-center hover:rounded-xl transition-all"
      >
        <Home size={22} className="text-white" />
      </button>

      <span className="w-8 h-px bg-white/10" />

      <button
        title="Create"
        className="w-12 h-12 rounded-2xl bg-[#2b2d31] ring-1 ring-white/5 flex items-center justify-center hover:bg-indigo-600 hover:ring-0 transition-all"
      >
        <Plus size={20} className="text-gray-300 hover:text-white" />
      </button>

      <button
        title="Members"
        className="w-12 h-12 rounded-2xl bg-[#2b2d31] ring-1 ring-white/5 flex items-center justify-center hover:bg-indigo-600 hover:ring-0 transition-all"
      >
        <Users size={20} className="text-gray-300 hover:text-white" />
      </button>
    </aside>
  );
}