import { Home, Plus, Users } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-20 bg-[#111214] border-r border-[#2b2d31] flex flex-col items-center py-5 gap-5">
      <button className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center hover:rounded-xl transition-all">
        <Home size={22} className="text-white" />
      </button>

      <button className="w-12 h-12 rounded-full bg-[#2b2d31] flex items-center justify-center hover:bg-indigo-600 transition">
        <Plus size={20} className="text-white" />
      </button>

      <button className="w-12 h-12 rounded-full bg-[#2b2d31] flex items-center justify-center hover:bg-indigo-600 transition">
        <Users size={20} className="text-white" />
      </button>
    </aside>
  );
}