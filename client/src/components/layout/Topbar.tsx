import { Bell, Search } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-16 border-b border-[#2b2d31] bg-[#1e1f22] px-8 flex items-center justify-between">
      <h2 className="text-white text-xl font-bold">
        CollabSpace AI
      </h2>

      <div className="flex items-center gap-5">
        <Search className="text-gray-400" size={20} />
        <Bell className="text-gray-400" size={20} />

        <img
          src="https://i.pravatar.cc/40"
          className="rounded-full w-10 h-10"
          alt="avatar"
        />
      </div>
    </header>
  );
}