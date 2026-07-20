import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Trash2,
  Download,
  Upload,
  Users,
  MessageSquare,
  FolderOpen,
  Copy,
  Check,
  Send,
  Bold,
  Italic,
  Underline,
  FileDown,
} from "lucide-react";

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
  downloadFile as downloadFileApi,
  deleteFile as deleteFileApi,
} from "../services/fileApi";

import {
  getNote,
  saveNote as saveNoteApi,
} from "../services/noteApi";

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

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-violet-500",
];

const FONT_OPTIONS = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
];

const initials = (name?: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const safeFileName = (name: string) =>
  (name || "document").replace(/[^\w\- ]+/g, "").trim() || "document";

const FileTypeIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon size={18} className="text-cyan-400 shrink-0" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText size={18} className="text-red-400 shrink-0" />;
  }
  return <FileIcon size={18} className="text-indigo-400 shrink-0" />;
};

export default function Workspace() {
  const { id } = useParams();
  const workspaceId = Number(id);

  const [workspace, setWorkspace] = useState<WorkspaceType | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState("");

  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState<PresenceEntry[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [noteTypers, setNoteTypers] = useState<string[]>([]);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isEditorFocused = useRef(false);

  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const noteTypingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const noteSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushActivity = (text: string) => {
    setActivity((prev) => [text, ...prev].slice(0, 6));
  };

  useEffect(() => {
    loadWorkspace();

    const user = currentUser();

    // Re-joins on first connect AND on every automatic reconnection
    // (network blip, backend restart, etc.) — without this, a dropped
    // connection would silently stop showing you as online/typing to
    // everyone else until a manual page refresh.
    const handleConnect = () => {
      setConnected(true);
      setConnectError("");
      socket.emit("join-workspace", {
        workspaceId,
        name: user.name,
      });
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleConnectError = (err: Error) => {
      setConnected(false);
      setConnectError(err.message || "Connection failed");
      console.error("Socket connect_error:", err.message);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.connect();

    socket.on("receive-message", (data: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    socket.on("typing", (data: { user: string }) => {
      const existing = typingTimeouts.current.get(data.user);
      if (existing) clearTimeout(existing);

      setTypingUsers((prev) =>
        prev.includes(data.user) ? prev : [...prev, data.user]
      );

      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== data.user));
        typingTimeouts.current.delete(data.user);
      }, 2000);

      typingTimeouts.current.set(data.user, timeout);
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

    socket.on(
      "note-update",
      (data: { content: string; updatedBy: string }) => {
        // Only overwrite the DOM if this user isn't actively typing —
        // otherwise an incoming update would reset their cursor position.
        if (!isEditorFocused.current && editorRef.current) {
          editorRef.current.innerHTML = data.content;
        }

        if (!data.updatedBy || data.updatedBy === user.name) return;

        const existing = noteTypingTimeouts.current.get(data.updatedBy);
        if (existing) clearTimeout(existing);

        setNoteTypers((prev) =>
          prev.includes(data.updatedBy) ? prev : [...prev, data.updatedBy]
        );

        const timeout = setTimeout(() => {
          setNoteTypers((prev) => prev.filter((n) => n !== data.updatedBy));
          noteTypingTimeouts.current.delete(data.updatedBy);
        }, 2000);

        noteTypingTimeouts.current.set(data.updatedBy, timeout);
      }
    );

    return () => {
      socket.emit("leave-workspace", workspaceId);

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("receive-message");
      socket.off("typing");
      socket.off("presence-update");
      socket.off("file-uploaded");
      socket.off("file-deleted");
      socket.off("note-update");

      typingTimeouts.current.forEach((t) => clearTimeout(t));
      typingTimeouts.current.clear();

      noteTypingTimeouts.current.forEach((t) => clearTimeout(t));
      noteTypingTimeouts.current.clear();

      if (noteSaveTimeout.current) clearTimeout(noteSaveTimeout.current);

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

      const noteRes = await getNote(workspaceId);
      if (editorRef.current) {
        editorRef.current.innerHTML = noteRes.content || "";
      }
    } catch (err) {
      console.log(err);
    }
  };

  const refreshActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML || "";

    // Live-broadcast every keystroke so other members see it as you type.
    socket.emit("note-update", {
      workspaceId,
      content: html,
      updatedBy: currentUser().name,
    });

    // Persist to the database on a short debounce rather than on every
    // keystroke, same pattern as the chat typing indicator on this page.
    setNoteStatus("saving");
    if (noteSaveTimeout.current) clearTimeout(noteSaveTimeout.current);
    noteSaveTimeout.current = setTimeout(async () => {
      try {
        await saveNoteApi(workspaceId, html);
        setNoteStatus("saved");
      } catch (err) {
        console.log(err);
      }
    }, 700);

    refreshActiveFormats();
  };

  const applyFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const exportPdf = () => {
    const el = editorRef.current;
    if (!el) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginX * 2;
    let y = 56;

    const blocks: { text: string; bold: boolean; italic: boolean }[] = [];
    const nodes = Array.from(el.childNodes);

    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text.trim()) blocks.push({ text, bold: false, italic: false });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const elNode = node as HTMLElement;
      const text = elNode.innerText || elNode.textContent || "";
      if (!text.trim()) return;

      const bold =
        !!elNode.querySelector("b, strong") ||
        ["B", "STRONG"].includes(elNode.tagName);
      const italic =
        !!elNode.querySelector("i, em") ||
        ["I", "EM"].includes(elNode.tagName);

      blocks.push({ text, bold, italic });
    });

    if (blocks.length === 0) {
      const text = el.innerText || "";
      if (text.trim()) blocks.push({ text, bold: false, italic: false });
    }

    doc.setFontSize(12);

    blocks.forEach((block) => {
      const style =
        block.bold && block.italic
          ? "bolditalic"
          : block.bold
          ? "bold"
          : block.italic
          ? "italic"
          : "normal";
      doc.setFont("helvetica", style);

      const lines: string[] = doc.splitTextToSize(block.text, maxWidth);
      lines.forEach((line) => {
        if (y > pageHeight - 56) {
          doc.addPage();
          y = 56;
        }
        doc.text(line, marginX, y);
        y += 18;
      });
      y += 6;
    });

    doc.save(`${safeFileName(workspace?.name || "document")}.pdf`);
  };

  const exportDoc = () => {
    const el = editorRef.current;
    if (!el) return;

    const html = `<!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${workspace?.name || "Document"}</title></head>
      <body>${el.innerHTML || ""}</body>
      </html>`;

    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(workspace?.name || "document")}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      const saved = await saveMessage(workspaceId, message);
      setMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
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
      // Remove immediately rather than waiting on the "file-deleted"
      // socket event, which only reliably reaches other members.
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const handleDownload = async (file: SharedFile) => {
    try {
      const res = await downloadFileApi(file.id);

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      // With responseType: "blob", axios can't auto-parse a JSON error
      // body — it arrives as a Blob, so the real backend message was
      // being silently swallowed. Unwrap it here so we see what actually
      // failed instead of a generic message.
      let reason = "Download failed";

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          reason = parsed.message || reason;
        } catch {
          // body wasn't JSON, fall back to the generic message
        }
      }

      console.error("Download error:", reason, err);
      alert(reason);
    }
  };

  const onlineUserIds = new Set(onlineUsers.map((u) => u.userId));
  const me = currentUser();

  const handleCopyInvite = () => {
    if (!workspace) return;
    navigator.clipboard.writeText(workspace.inviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1500);
  };

  const toolbarBtn = (active: boolean) =>
    `h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
      active
        ? "bg-indigo-600 text-white"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-[#1e1f22]">
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-r from-[#2b2d31] via-[#26282c] to-[#1e1f22] px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {workspace?.name || "Loading..."}
            </h1>

            <button
              onClick={handleCopyInvite}
              className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-300 group"
            >
              <span>Invite code:</span>
              <span className="font-mono font-semibold text-indigo-400 group-hover:text-indigo-300">
                {workspace?.inviteCode}
              </span>
              {copiedInvite ? (
                <Check size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} className="opacity-60" />
              )}
            </button>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 ${
              connected ? "bg-white/5" : "bg-amber-500/10"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
            </span>
            <span
              className={`text-sm ${
                connected ? "text-gray-300" : "text-amber-400"
              }`}
              title={connectError || undefined}
            >
              {connected
                ? `${onlineUsers.length} online`
                : connectError
                ? `Connection failed: ${connectError}`
                : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Live activity feed */}
        {activity.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activity.map((text, i) => (
              <span
                key={i}
                className="text-xs text-gray-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full animate-in fade-in slide-in-from-left-1"
              >
                {text}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 items-start">
        {/* Left column: Members + Shared Files */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-[420px] lg:h-[760px]">
          {/* Members */}
          <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-xl shadow-black/20 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5 shrink-0">
              <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Users size={14} className="text-indigo-400" />
              </span>
              <h2 className="text-white font-semibold">Members</h2>
              <span className="text-xs text-gray-500 ml-auto">
                {members.length}
              </span>
            </div>

            <div className="p-3 space-y-1.5 overflow-y-auto flex-1">
              {members.map((member) => {
                const online = onlineUserIds.has(member.id);
                return (
                  <div
                    key={member.id}
                    className="rounded-xl p-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`h-9 w-9 rounded-full ${avatarColor(
                          member.id
                        )} flex items-center justify-center text-white text-xs font-bold`}
                      >
                        {initials(member.name)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#2b2d31] ${
                          online ? "bg-emerald-500" : "bg-gray-600"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {member.name}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {online ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Files */}
          <div className="bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-xl shadow-black/20 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <FolderOpen size={14} className="text-indigo-400" />
                </span>
                <h2 className="text-white font-semibold">Shared Files</h2>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors text-white text-xs font-medium px-3 py-1.5 rounded-lg"
              >
                <Upload size={13} />
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

            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                  <FolderOpen size={28} className="opacity-30" />
                  <p className="text-sm text-center px-4">No files shared yet</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-[#1e1f22] rounded-xl p-3 flex items-start gap-3 hover:bg-[#232428] transition-colors group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <FileTypeIcon mimeType={file.mimeType} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {formatSize(file.size)} · {file.uploader.name}
                      </p>
                      <p className="text-gray-600 text-[11px] mt-0.5">
                        {new Date(file.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleDownload(file)}
                        className="text-gray-400 hover:text-indigo-400"
                        title="Download"
                      >
                        <Download size={15} />
                      </button>

                      {(file.uploader.id === me.id ||
                        workspace?.ownerId === me.id) && (
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center: Document editor */}
        <div className="lg:col-span-6 bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-xl shadow-black/20 flex flex-col overflow-hidden h-[520px] lg:h-[760px]">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5 shrink-0">
            <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <FileText size={14} className="text-indigo-400" />
            </span>
            <h2 className="text-white font-semibold">Shared Document</h2>

            <span className="text-xs ml-auto flex items-center gap-3">
              {noteTypers.length > 0 && (
                <span className="text-indigo-400 italic">
                  {noteTypers.length === 1
                    ? `${noteTypers[0]} is editing...`
                    : `${noteTypers.length} people editing...`}
                </span>
              )}
              <span className="text-gray-500">
                {noteStatus === "saving" && "Saving..."}
                {noteStatus === "saved" && "Saved"}
              </span>
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-[#232428] shrink-0 flex-wrap">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("bold")}
              className={toolbarBtn(activeFormats.bold)}
              title="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("italic")}
              className={toolbarBtn(activeFormats.italic)}
              title="Italic"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("underline")}
              className={toolbarBtn(activeFormats.underline)}
              title="Underline"
            >
              <Underline size={15} />
            </button>

            <span className="w-px h-6 bg-white/10 mx-1" />

            <select
              defaultValue="Arial"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => applyFormat("fontName", e.target.value)}
              className="bg-[#1e1f22] text-gray-200 text-xs rounded-lg px-2.5 py-1.5 outline-none ring-1 ring-transparent focus:ring-indigo-500 cursor-pointer"
              title="Font"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>

            <label
              className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors overflow-hidden"
              title="Text color"
            >
              <input
                type="color"
                defaultValue="#e5e7eb"
                onChange={(e) => applyFormat("foreColor", e.target.value)}
                className="opacity-0 absolute h-8 w-8 cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-200 pointer-events-none">
                A
              </span>
            </label>

            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={exportPdf}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 transition-colors text-gray-200 text-xs font-medium px-3 py-1.5 rounded-lg"
                title="Download as PDF"
              >
                <FileDown size={13} />
                PDF
              </button>
              <button
                type="button"
                onClick={exportDoc}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 transition-colors text-gray-200 text-xs font-medium px-3 py-1.5 rounded-lg"
                title="Download as Word document"
              >
                <FileDown size={13} />
                DOC
              </button>
            </span>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onFocus={() => (isEditorFocused.current = true)}
            onBlur={() => (isEditorFocused.current = false)}
            onKeyUp={refreshActiveFormats}
            onMouseUp={refreshActiveFormats}
            data-placeholder="Start typing — everyone in this workspace sees updates live, and it's saved automatically."
            className="flex-1 min-h-0 overflow-y-auto text-white text-sm leading-relaxed p-6 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
          />
        </div>

        {/* Chat */}
        <div className="lg:col-span-3 bg-[#2b2d31] rounded-2xl ring-1 ring-white/5 shadow-xl shadow-black/20 flex flex-col overflow-hidden h-[420px] lg:h-[760px]">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5 shrink-0">
            <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <MessageSquare size={14} className="text-indigo-400" />
            </span>
            <h2 className="text-white font-semibold">Workspace Chat</h2>
          </div>

          <div className="flex-1 min-h-0 px-4 py-4 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                <MessageSquare size={28} className="opacity-30" />
                <p className="text-sm text-center px-4">
                  No messages yet — say hi to get things started
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender.name === me.name;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[92%] ${
                      isMe ? "ml-auto flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full ${avatarColor(
                        msg.sender.id
                      )} flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1`}
                    >
                      {initials(msg.sender.name)}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? "bg-indigo-600 rounded-tr-sm"
                          : "bg-[#1e1f22] rounded-tl-sm"
                      }`}
                    >
                      {!isMe && (
                        <p className="text-xs font-semibold text-indigo-400 mb-0.5">
                          {msg.sender.name}
                        </p>
                      )}
                      <p className="text-white text-sm leading-relaxed break-words">
                        {msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isMe ? "text-indigo-200/70" : "text-gray-500"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef}></div>
          </div>

          <div className="px-4 h-6 -mt-1 flex items-center shrink-0">
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 italic">
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 rounded-full bg-gray-500 animate-bounce" />
                </span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers.length} people are typing...`}
              </div>
            )}
          </div>

          <div className="flex gap-2 p-4 pt-2 border-t border-white/5 shrink-0">
            <input
              className="flex-1 rounded-xl bg-[#1e1f22] text-white text-sm px-4 py-2.5 outline-none ring-1 ring-transparent focus:ring-indigo-500 transition-shadow placeholder:text-gray-500"
              placeholder="Type a message..."
              value={message}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />

            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors px-4 rounded-xl text-white text-sm font-medium shrink-0"
            >
              <Send size={14} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}