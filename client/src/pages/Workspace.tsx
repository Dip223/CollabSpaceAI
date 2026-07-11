import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Image as ImageIcon, File as FileIcon, Trash2, Download, Upload } from "lucide-react";

import {
  getWorkspace,
  getWorkspaceMembers,
} from "../services/serverApi";

import {
  getMessages,
  sendMessage as saveMessage,
} from "../services/messageApi";

import {
  getFiles,
  uploadFile as uploadFileApi,
  deleteFile as deleteFileApi,
} from "../services/fileApi";

import socket from "../socket/socket";

interface WorkspaceType {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
}

interface Member {
  id: number;
  name: string;
  email: string;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;

  sender: {
    id: number;
    name: string;
    email: string;
  };
}

interface SharedFile {
  id: number;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader: {
    id: number;
    name: string;
    email: string;
  };
}

interface PresenceEntry {
  userId: number;
  name: string;
}

const currentUser = () =>
  JSON.parse(localStorage.getItem("user") || "{}");

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileTypeIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon size={20} className="text-cyan-400 shrink-0" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText size={20} className="text-red-400 shrink-0" />;
  }
  return <FileIcon size={20} className="text-indigo-400 shrink-0" />;
};

export default function Workspace() {
  const { id } = useParams();
  const workspaceId = Number(id);

  const [workspace, setWorkspace] = useState<WorkspaceType | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState("");

  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState<PresenceEntry[]>([]);
  const [activity, setActivity] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pushActivity = (text: string) => {
    setActivity((prev) => [text, ...prev].slice(0, 6));
  };

  useEffect(() => {
    loadWorkspace();

    const user = currentUser();

    socket.connect();

    socket.emit("join-workspace", {
      workspaceId,
      name: user.name,
    });

    socket.on("receive-message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("typing", (data: { user: string }) => {
      setTyping(`${data.user} is typing...`);
      setTimeout(() => setTyping(""), 1000);
    });

    socket.on("presence-update", (users: PresenceEntry[]) => {
      setOnlineUsers(users);
    });

    socket.on("file-uploaded", (file: SharedFile) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [file, ...prev];
      });
      if (file.uploader.id !== user.id) {
        pushActivity(`${file.uploader.name} uploaded ${file.name}`);
      }
    });

    socket.on(
      "file-deleted",
      (data: { fileId: number; fileName: string; deletedBy: string }) => {
        setFiles((prev) => prev.filter((f) => f.id !== data.fileId));
        pushActivity(`${data.deletedBy} deleted ${data.fileName}`);
      }
    );

    return () => {
      socket.emit("leave-workspace", workspaceId);

      socket.off("receive-message");
      socket.off("typing");
      socket.off("presence-update");
      socket.off("file-uploaded");
      socket.off("file-deleted");

      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadWorkspace = async () => {
    try {
      const workspaceRes = await getWorkspace(workspaceId);
      setWorkspace(workspaceRes.data.server);

      const memberRes = await getWorkspaceMembers(workspaceId);
      setMembers(memberRes.data.members);

      const oldMessages = await getMessages(workspaceId);
      setMessages(oldMessages);

      const fileRes = await getFiles(workspaceId);
      setFiles(fileRes.data.files);
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      const saved = await saveMessage(workspaceId, message);
      socket.emit("send-message", saved);
      setMessage("");
    } catch (err) {
      console.log(err);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    socket.emit("typing", {
      workspaceId,
      user: currentUser().name,
    });
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const res = await uploadFileApi(workspaceId, file);
      // Add immediately from the API response rather than waiting on the
      // socket event, which may lag or miss the uploader's own socket.
      // The socket handler above dedupes by id, so no double-entry risk.
      setFiles((prev) => {
        if (prev.some((f) => f.id === res.data.id)) return prev;
        return [res.data, ...prev];
      });
    } catch (err: any) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (file: SharedFile) => {
    if (!confirm(`Delete "${file.name}"? This can't be undone.`)) return;

    try {
      await deleteFileApi(file.id);
      // Removed from the list via the "file-deleted" socket event.
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const onlineUserIds = new Set(onlineUsers.map((u) => u.userId));
  const me = currentUser();

  return (
    <div className="min-h-screen bg-[#313338] p-8">
      <h1 className="text-4xl font-bold text-white">{workspace?.name}</h1>

      <p className="text-gray-400 mt-2">
        Invite Code :
        <span className="text-indigo-400 ml-2 font-semibold">
          {workspace?.inviteCode}
        </span>
      </p>

      {activity.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          {activity.map((text, i) => (
            <p
              key={i}
              className="text-sm text-gray-400 bg-[#2b2d31] w-fit px-3 py-1 rounded-md"
            >
              {text}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-6 mt-6">
        {/* Members */}
        <div className="bg-[#2b2d31] rounded-xl p-5">
          <h2 className="text-white text-xl font-bold mb-5">
            Members
            <span className="ml-2 text-sm font-normal text-green-400">
              {onlineUsers.length > 0 && `${onlineUsers.length} online`}
            </span>
          </h2>

          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-[#1e1f22] rounded-lg p-3 flex items-center gap-2"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    onlineUserIds.has(member.id)
                      ? "bg-green-500"
                      : "bg-gray-600"
                  }`}
                  title={onlineUserIds.has(member.id) ? "Online" : "Offline"}
                />

                <div>
                  <p className="text-white font-semibold">{member.name}</p>
                  <p className="text-gray-400 text-sm">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="col-span-2 bg-[#2b2d31] rounded-xl p-5 flex flex-col">
          <h2 className="text-white text-xl font-bold">Workspace Chat</h2>

          <div
            className="flex-1 mt-5 bg-[#1e1f22] rounded-lg p-4 overflow-y-auto space-y-3"
            style={{ height: "500px" }}
          >
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">
                No messages yet...
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg p-3 max-w-[80%] ${
                    msg.sender.name === me.name
                      ? "bg-indigo-600 ml-auto"
                      : "bg-[#2b2d31]"
                  }`}
                >
                  <p className="font-semibold text-white">
                    {msg.sender.name}
                  </p>
                  <p className="text-white mt-1">{msg.content}</p>
                  <p className="text-xs text-gray-300 mt-2">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
            <div ref={bottomRef}></div>
          </div>

          <p className="text-gray-400 h-6 mt-2">{typing}</p>

          <div className="flex gap-3 mt-2">
            <input
              className="flex-1 rounded-lg bg-[#1e1f22] text-white p-3 outline-none"
              placeholder="Type a message..."
              value={message}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />

            <button
              onClick={sendMessage}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-lg text-white"
            >
              Send
            </button>
          </div>
        </div>

        {/* Files */}
        <div className="bg-[#2b2d31] rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-xl font-bold">Shared Files</h2>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg"
            >
              <Upload size={14} />
              {uploading ? "Uploading..." : "Upload"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.zip,image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileSelect}
            />
          </div>

          <div
            className="mt-5 bg-[#1e1f22] rounded-lg overflow-y-auto space-y-2 p-3"
            style={{ height: "500px" }}
          >
            {files.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">
                No files shared yet
              </p>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="bg-[#2b2d31] rounded-lg p-3 flex items-start gap-2"
                >
                  <FileTypeIcon mimeType={file.mimeType} />

                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {formatSize(file.size)} · {file.uploader.name}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(file.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    download={file.name}
                    className="text-gray-400 hover:text-indigo-400 shrink-0"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>

                  {(file.uploader.id === me.id ||
                    workspace?.ownerId === me.id) && (
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="text-gray-400 hover:text-red-400 shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}