import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  Strikethrough,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link2,
  Minus,
  Eraser,
  Import,
  ArrowLeft,
  Table,
  Square,
  FileDown,
} from "lucide-react";

import ThemeToggle from "../components/ThemeToggle";

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

// ================= SHAPE INSERTION =================
// Shapes are inserted as plain styled <span> elements (not SVG) — that
// keeps them simple to build with execCommand("insertHTML"), and plain
// bordered/colored boxes are what a Word-compatible HTML export renders
// most reliably. "currentColor" is used everywhere so a shape's outline
// automatically matches the editor's current theme-aware text color.
type ShapeDef = {
  id: string;
  label: string;
  insertStyle: Record<string, string>;
  previewStyle: React.CSSProperties;
};

// Every inserted shape carries resize:both (or resize:horizontal for lines,
// since length is the meaningful dimension there) plus overflow:hidden,
// which is what makes the browser draw a native drag handle in the
// bottom-right corner — no custom drag/mouse-tracking JS needed. Note this
// is why triangle uses clip-path instead of the classic zero-size
// border-trick: a 0x0 box has nothing for a resize handle to resize.
const SHAPE_DEFS: ShapeDef[] = [
  {
    id: "square",
    label: "Square",
    insertStyle: {
      width: "90px",
      height: "90px",
      border: "2px solid currentColor",
      resize: "both",
      overflow: "hidden",
    },
    previewStyle: { width: 20, height: 20, border: "2px solid currentColor" },
  },
  {
    id: "rectangle",
    label: "Rectangle",
    insertStyle: {
      width: "150px",
      height: "80px",
      border: "2px solid currentColor",
      resize: "both",
      overflow: "hidden",
    },
    previewStyle: { width: 26, height: 16, border: "2px solid currentColor" },
  },
  {
    id: "circle",
    label: "Circle",
    insertStyle: {
      width: "90px",
      height: "90px",
      border: "2px solid currentColor",
      "border-radius": "50%",
      resize: "both",
      overflow: "hidden",
    },
    previewStyle: { width: 20, height: 20, border: "2px solid currentColor", borderRadius: "50%" },
  },
  {
    id: "ellipse",
    label: "Ellipse",
    insertStyle: {
      width: "150px",
      height: "80px",
      border: "2px solid currentColor",
      "border-radius": "50%",
      resize: "both",
      overflow: "hidden",
    },
    previewStyle: { width: 26, height: 16, border: "2px solid currentColor", borderRadius: "50%" },
  },
  {
    id: "triangle",
    label: "Triangle",
    insertStyle: {
      width: "90px",
      height: "80px",
      background: "currentColor",
      "clip-path": "polygon(50% 0%, 0% 100%, 100% 100%)",
      resize: "both",
      overflow: "hidden",
    },
    previewStyle: {
      width: 20,
      height: 18,
      background: "currentColor",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    },
  },
  {
    id: "diamond",
    label: "Diamond",
    insertStyle: {
      width: "80px",
      height: "80px",
      background: "currentColor",
      "clip-path": "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      resize: "both",
      overflow: "hidden",
    },
    previewStyle: {
      width: 18,
      height: 18,
      background: "currentColor",
      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    },
  },
  {
    id: "line",
    label: "Line",
    insertStyle: {
      width: "150px",
      height: "14px",
      "border-bottom": "3px solid currentColor",
      resize: "horizontal",
      overflow: "hidden",
    },
    previewStyle: { width: 26, height: 10, borderBottom: "2px solid currentColor" },
  },
  {
    id: "dashed",
    label: "Dashed line",
    insertStyle: {
      width: "150px",
      height: "14px",
      "border-bottom": "3px dashed currentColor",
      resize: "horizontal",
      overflow: "hidden",
    },
    previewStyle: { width: 26, height: 10, borderBottom: "2px dashed currentColor" },
  },
];

const styleToCss = (style: Record<string, string>) =>
  Object.entries(style)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

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

// ================= LIVE CURSOR POSITIONING =================
// Cursor positions are communicated as a plain character offset into the
// editor's text content, rather than raw screen coordinates — screen
// coordinates aren't portable between different users' viewports/scroll
// positions, but a text offset can be turned back into a real DOM Range
// (and then a screen position) locally on each client.

const getTextOffset = (root: Node, node: Node, offset: number): number => {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === node) return total + offset;
    total += current.textContent?.length || 0;
  }
  return total;
};

const getRangeFromOffset = (root: Node, target: number): Range | null => {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const len = current.textContent?.length || 0;
    if (total + len >= target) {
      const range = document.createRange();
      range.setStart(current, Math.max(0, target - total));
      range.collapse(true);
      return range;
    }
    total += len;
  }
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  return range;
};

// Collapsed ranges positioned exactly at a text-node boundary (start/end of
// a line, an empty node, right after a <br>, etc.) frequently report an
// empty ClientRects list in Chrome — that's what made remote typers' name
// labels flicker in and out instead of tracking them reliably. Widen the
// range by one character (forward, then backward as a fallback) before
// measuring so we always get a real, non-empty rect to position from.
const measureCaretRect = (root: Node, target: number): DOMRect | null => {
  const collapsed = getRangeFromOffset(root, target);
  const isUsable = (r: Range) => r.getClientRects().length > 0;

  if (isUsable(collapsed)) {
    return collapsed.getClientRects()[0];
  }

  try {
    const forward = collapsed.cloneRange();
    const endLen = forward.endContainer.textContent?.length ?? forward.endOffset;
    forward.setEnd(forward.endContainer, Math.min(endLen, forward.endOffset + 1));
    if (isUsable(forward)) return forward.getClientRects()[0];
  } catch {
    // fall through to the backward attempt below
  }

  if (target > 0) {
    try {
      const backward = getRangeFromOffset(root, target - 1);
      backward.setEnd(collapsed.startContainer, collapsed.startOffset);
      if (isUsable(backward)) {
        const rects = backward.getClientRects();
        return rects[rects.length - 1];
      }
    } catch {
      // fall through to the final fallback below
    }
  }

  // Last resort — a zeroed-out rect means "nowhere sensible to draw this",
  // so treat it as no rect rather than pinning the label to the corner.
  const fallback = collapsed.getBoundingClientRect();
  if (fallback.width === 0 && fallback.height === 0 && fallback.top === 0 && fallback.left === 0) {
    return null;
  }
  return fallback;
};

const CURSOR_COLORS = [
  "#f43f5e",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

const cursorColorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
};

// ================= PDF EXPORT STYLE RESOLUTION =================
// jsPDF only ships helvetica/times/courier — map our toolbar's web fonts to
// the closest built-in equivalent (embedding real font files is far more
// involved and out of scope here).

const PDF_FONT_MAP: Record<string, string> = {
  Arial: "helvetica",
  Verdana: "helvetica",
  Georgia: "times",
  "Times New Roman": "times",
  "Courier New": "courier",
};

type Align = "left" | "center" | "right" | "justify";

type TextRun = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: [number, number, number];
  font: string;
  size: number;
  align: Align;
};
type ImageRun = {
  image: string;
  format: "PNG" | "JPEG" | "GIF" | "WEBP";
  width: number;
  height: number;
  align: Align;
};
type ShapeRun = {
  shape: string;
  width: number;
  height: number;
  color: [number, number, number];
  align: Align;
};
type TableRun = {
  table: true;
  cells: string[][];
  colWidths: number[];
  align: Align;
};
type PdfToken = TextRun | ImageRun | ShapeRun | TableRun | { break: true };

const parseRgb = (css: string): [number, number, number] | null => {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

// execCommand("foreColor") sets an explicit inline color (or a legacy
// <font color> tag) on the exact node the user selected — walk up from the
// text node looking for that, stopping at the editor root. We deliberately
// don't use getComputedStyle for color: the editor's own container is styled
// with a theme-aware text color, and getComputedStyle would resolve that
// inherited color for every run that was never explicitly colored, which can
// go invisible once printed on a white PDF page.
const findExplicitColor = (node: Element, root: Element): string | null => {
  let current: Element | null = node;
  while (current && current !== root) {
    const inline = (current as HTMLElement).style?.color;
    if (inline) return inline;
    if (current.tagName === "FONT" && current.getAttribute("color")) {
      return current.getAttribute("color");
    }
    current = current.parentElement;
  }
  return null;
};

const resolveRunStyle = (el: Element, root: Element): Omit<TextRun, "text"> => {
  const cs = window.getComputedStyle(el);
  const weight = parseInt(cs.fontWeight, 10) || (cs.fontWeight === "bold" ? 700 : 400);
  const family = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  const explicitColor = findExplicitColor(el, root);
  const rgb = explicitColor ? parseRgb(explicitColor) || hexToRgb(explicitColor) : null;
  // px -> pt (roughly *0.75), clamped to a sane printable range. This is what
  // lets both heading tags (sized via CSS) and the manual font-size dropdown
  // (sized via the legacy <font size> attribute, which browsers still resolve
  // to a real computed pixel size) carry through to the exported PDF.
  const pxSize = parseFloat(cs.fontSize) || 16;
  const size = Math.max(8, Math.min(36, Math.round(pxSize * 0.75)));
  // text-align is inherited, so reading it off any descendant already
  // resolves to whatever block ancestor actually set it — no need to walk
  // up the tree ourselves.
  const align: Align =
    cs.textAlign === "center"
      ? "center"
      : cs.textAlign === "right" || cs.textAlign === "end"
      ? "right"
      : cs.textAlign === "justify"
      ? "justify"
      : "left";

  return {
    bold: weight >= 600,
    italic: cs.fontStyle === "italic",
    underline: (cs.textDecorationLine || cs.textDecoration || "").includes("underline"),
    color: rgb || [17, 17, 17],
    font: PDF_FONT_MAP[family] || "helvetica",
    size,
    align,
  };
};

const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

// Only data-URL images can be embedded without an extra async fetch — that
// covers everything our own toolbar inserts (local file picker, and shared
// files pulled from the workspace). An external http(s) <img src> would
// need a network round-trip mid-layout, so those are left out.
const imageFormatFromDataUrl = (
  dataUrl: string
): "PNG" | "JPEG" | "GIF" | "WEBP" | null => {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|gif|webp)/i);
  if (!m) return null;
  const type = m[1].toLowerCase();
  if (type === "png") return "PNG";
  if (type === "gif") return "GIF";
  if (type === "webp") return "WEBP";
  return "JPEG";
};

const walkForPdf = (
  node: Node,
  root: Element,
  tokens: PdfToken[],
  listContext?: { ordered: boolean; index: number }
) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (!text) return;
    const parentEl = node.parentElement;
    const style = parentEl
      ? resolveRunStyle(parentEl, root)
      : {
          bold: false,
          italic: false,
          underline: false,
          color: [17, 17, 17] as [number, number, number],
          font: "helvetica",
          size: 12,
          align: "left" as Align,
        };
    tokens.push({ text, ...style });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;

  if (el.tagName === "BR") {
    tokens.push({ break: true });
    return;
  }

  if (el.tagName === "HR") {
    tokens.push({ break: true });
    tokens.push({ break: true });
    return;
  }

  if (el.tagName === "IMG") {
    const imgEl = el as HTMLImageElement;
    const src = imgEl.currentSrc || imgEl.src;
    const format = imageFormatFromDataUrl(src);
    const width = imgEl.naturalWidth || imgEl.width || 0;
    const height = imgEl.naturalHeight || imgEl.height || 0;
    if (format && width > 0 && height > 0) {
      const { align } = resolveRunStyle(el, root);
      tokens.push({ image: src, format, width, height, align });
    }
    return;
  }

  // Shapes inserted via the toolbar are tagged with data-shape. We read
  // getBoundingClientRect() rather than the original insert size, so any
  // manual resize (native CSS resize handle) the person did carries over.
  if (el.tagName === "SPAN" && el.hasAttribute("data-shape")) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const { color, align } = resolveRunStyle(el, root);
      tokens.push({
        shape: el.getAttribute("data-shape") || "square",
        width: rect.width,
        height: rect.height,
        color,
        align,
      });
    }
    return;
  }

  // Tables are read directly via the table DOM APIs rather than recursed
  // into token-by-token — that gives a clean per-cell grid straight away,
  // including each column's real rendered width (so a manually resized
  // column carries over into the PDF too). Only plain cell text is kept;
  // rich formatting inside a cell isn't preserved in the PDF.
  if (el.tagName === "TABLE") {
    const tableEl = el as HTMLTableElement;
    const rows = Array.from(tableEl.rows);
    if (rows.length === 0) return;

    const cells = rows.map((row) =>
      Array.from(row.cells).map((cell) => (cell.textContent || "").trim())
    );
    const colWidths = Array.from(rows[0].cells).map(
      (cell) => cell.getBoundingClientRect().width || 60
    );
    const { align } = resolveRunStyle(el, root);

    tokens.push({ table: true, cells, colWidths, align });
    return;
  }

  if (el.tagName === "LI") {
    const bullet = listContext?.ordered ? `${listContext.index}. ` : "•  ";
    tokens.push({ text: bullet, ...resolveRunStyle(el, root) });
    el.childNodes.forEach((child) => walkForPdf(child, root, tokens));
    tokens.push({ break: true });
    return;
  }

  if (el.tagName === "UL" || el.tagName === "OL") {
    let index = 1;
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === "LI") {
        walkForPdf(child, root, tokens, { ordered: el.tagName === "OL", index });
        index += 1;
      } else {
        walkForPdf(child, root, tokens, listContext);
      }
    });
    return;
  }

  const isBlock =
    el.tagName === "DIV" ||
    el.tagName === "P" ||
    el.tagName === "H1" ||
    el.tagName === "H2" ||
    el.tagName === "H3";

  node.childNodes.forEach((child) => walkForPdf(child, root, tokens, listContext));
  if (isBlock) tokens.push({ break: true });
};

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
    strikeThrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  const [openMenu, setOpenMenu] = useState<"table" | "shape" | null>(null);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);
  const insertMenuRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const cursorLayerRef = useRef<HTMLDivElement>(null);
  const isEditorFocused = useRef(false);

  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const noteTypingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const noteSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteCursors = useRef<
    Map<string, { offset: number; updatedAt: number; color: string }>
  >(new Map());

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
      (data: { content: string; updatedBy: string; cursorOffset?: number }) => {
        // Only overwrite the DOM if this user isn't actively typing —
        // otherwise an incoming update would reset their cursor position.
        if (!isEditorFocused.current && editorRef.current) {
          editorRef.current.innerHTML = data.content;
        }

        // The sender's caret offset rides along in this SAME message as the
        // content it was measured against, so applying it here is atomic —
        // no separate "note-cursor" event that could arrive before/after
        // this one and get interpreted against mismatched content. That
        // ordering race barely showed up on localhost (near-zero latency),
        // but became the norm across real devices/networks with real RTT,
        // which is why cursor names looked fine on one machine and broken
        // across two different devices/networks.
        if (
          data.updatedBy &&
          data.updatedBy !== user.name &&
          typeof data.cursorOffset === "number"
        ) {
          remoteCursors.current.set(data.updatedBy, {
            offset: data.cursorOffset,
            updatedAt: Date.now(),
            color: cursorColorFor(data.updatedBy),
          });
        }

        // Content changed, so every remembered cursor offset now points at
        // a possibly-different DOM position — recompute where they land.
        renderCursorOverlay();

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

    socket.on(
      "note-cursor",
      (data: { name: string; offset: number }) => {
        if (!data.name || data.name === user.name) return;

        remoteCursors.current.set(data.name, {
          offset: data.offset,
          updatedAt: Date.now(),
          color: cursorColorFor(data.name),
        });

        renderCursorOverlay();
      }
    );

    // Prunes cursors for members who went inactive/disconnected without a
    // fresh event arriving to trigger a redraw (e.g. a closed tab). Kept a
    // little longer than the old 6s so a slow mobile-data round trip
    // doesn't make a name blink away between two real keystrokes.
    const cursorPruneInterval = setInterval(renderCursorOverlay, 2000);

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
      socket.off("note-cursor");

      typingTimeouts.current.forEach((t) => clearTimeout(t));
      typingTimeouts.current.clear();

      noteTypingTimeouts.current.forEach((t) => clearTimeout(t));
      noteTypingTimeouts.current.clear();

      if (noteSaveTimeout.current) clearTimeout(noteSaveTimeout.current);
      clearInterval(cursorPruneInterval);
      remoteCursors.current.clear();

      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        insertMenuRef.current &&
        !insertMenuRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

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
      strikeThrough: document.queryCommandState("strikeThrough"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  // Redraws every remote user's colored cursor + name label at their last
  // known text offset, translated to a live screen position. Cheap enough to
  // call on every keystroke/scroll/cursor event — it's plain DOM writes, not
  // a React re-render.
  const renderCursorOverlay = () => {
    const layer = cursorLayerRef.current;
    const editor = editorRef.current;
    if (!layer || !editor) return;

    const now = Date.now();
    remoteCursors.current.forEach((entry, name) => {
      if (now - entry.updatedAt > 8000) remoteCursors.current.delete(name);
    });

    const editorRect = editor.getBoundingClientRect();
    const activeNames = new Set(remoteCursors.current.keys());

    Array.from(layer.children).forEach((child) => {
      const name = (child as HTMLElement).dataset.cursorName;
      if (name && !activeNames.has(name)) layer.removeChild(child);
    });

    remoteCursors.current.forEach((entry, name) => {
      const rect = measureCaretRect(editor, entry.offset);
      // No reliable rect this cycle (rare) — keep whatever position/
      // visibility the label already had rather than flicker it away.
      if (!rect) return;

      const top = rect.top - editorRect.top;
      const left = rect.left - editorRect.left;
      // Hide (rather than remove) cursors currently scrolled out of view so
      // they don't visually clip mid-character at the editor's edge.
      const visible = top >= -4 && top <= editorRect.height;

      let labelEl = layer.querySelector<HTMLDivElement>(
        `[data-cursor-name="${CSS.escape(name)}"]`
      );

      if (!labelEl) {
        labelEl = document.createElement("div");
        labelEl.dataset.cursorName = name;
        Object.assign(labelEl.style, {
          position: "absolute",
          pointerEvents: "none",
          transition: "top 0.08s linear, left 0.08s linear",
          zIndex: "10",
        });

        const bar = document.createElement("div");
        Object.assign(bar.style, {
          width: "2px",
          height: "18px",
          background: entry.color,
          borderRadius: "1px",
        });

        const tag = document.createElement("div");
        tag.textContent = name;
        Object.assign(tag.style, {
          position: "absolute",
          bottom: "20px",
          left: "0",
          whiteSpace: "nowrap",
          fontSize: "11px",
          fontWeight: "600",
          lineHeight: "1",
          color: "#fff",
          padding: "3px 6px",
          borderRadius: "5px",
          background: entry.color,
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        });

        labelEl.appendChild(bar);
        labelEl.appendChild(tag);
        layer.appendChild(labelEl);
      }

      labelEl.style.top = `${top}px`;
      labelEl.style.left = `${left}px`;
      labelEl.style.display = visible ? "block" : "none";
    });
  };

  const getCurrentCaretOffset = (): number | null => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return null;
    return getTextOffset(editor, range.startContainer, range.startOffset);
  };

  const broadcastCursor = () => {
    const offset = getCurrentCaretOffset();
    if (offset === null) return;
    socket.emit("note-cursor", {
      workspaceId,
      name: currentUser().name,
      offset,
    });
  };

  const handleSelectionActivity = () => {
    refreshActiveFormats();
    broadcastCursor();
  };

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML || "";

    // Live-broadcast every keystroke so other members see it as you type.
    // The caret offset is bundled into this SAME event (rather than relying
    // solely on the separate "note-cursor" broadcast below) so a receiver
    // never has to pair this content with a cursor position that arrived in
    // a different message — see the note-update handler above for why that
    // pairing matters once real network latency/jitter is involved.
    socket.emit("note-update", {
      workspaceId,
      content: html,
      updatedBy: currentUser().name,
      cursorOffset: getCurrentCaretOffset(),
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

    handleSelectionActivity();
    renderCursorOverlay();
  };

  const applyFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL (e.g. https://example.com)");
    if (!url) return;
    applyFormat("createLink", url);
  };

  const insertTable = () => {
    const rows = Math.min(20, Math.max(1, tableRows || 1));
    const cols = Math.min(10, Math.max(1, tableCols || 1));

    // resize:both on each cell gives a native drag handle in that cell's
    // corner. Because HTML tables share one width per column and one
    // height per row, dragging any single cell resizes its whole
    // row/column — no custom column/row-divider dragging code needed.
    const cellStyle =
      "border:1px solid currentColor;padding:6px 10px;min-width:40px;min-height:24px;resize:both;overflow:hidden;";

    let html = '<table style="border-collapse:collapse;width:100%;margin:10px 0;">';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="${cellStyle}">&nbsp;</td>`;
      }
      html += "</tr>";
    }
    html += "</table><p><br></p>";

    applyFormat("insertHTML", html);
    setOpenMenu(null);
  };

  const insertShape = (shape: ShapeDef) => {
    const css = styleToCss(shape.insertStyle);
    // contenteditable="false" makes the shape act as a single atomic unit —
    // the cursor steps around it rather than landing inside an empty box.
    // data-shape is what lets PDF export recognize this element and know
    // which primitive to draw, without trying to reverse-engineer it from
    // raw CSS (border vs background vs clip-path etc).
    const html = `<span contenteditable="false" data-shape="${shape.id}" style="display:inline-block;${css};margin:6px;vertical-align:middle;"></span>&nbsp;`;
    applyFormat("insertHTML", html);
    setOpenMenu(null);
  };

  // Images are embedded as base64 data URLs directly in the note's HTML —
  // simple and works with the existing save/broadcast pipeline with no
  // backend changes, but it does bloat the document for large images.
  // Prefer the "Shared Files" panel for anything sizeable.
  const insertImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      editorRef.current?.focus();
      document.execCommand("insertImage", false, dataUrl);
      handleEditorInput();
    };
    reader.readAsDataURL(file);
  };

  const exportPdf = () => {
    const el = editorRef.current;
    if (!el) return;

    if (!(el.innerText || "").trim()) {
      alert("Write something in the document before exporting.");
      return;
    }

    const tokens: PdfToken[] = [];
    el.childNodes.forEach((child) => walkForPdf(child, el, tokens));

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    const marginY = 56;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginX * 2;
    const BASE_LINE_HEIGHT = 16;
    const PX_TO_PT = 0.75;

    let y = marginY;
    let lineHeight = BASE_LINE_HEIGHT;

    // Alignment can't be decided word-by-word as we draw — we only know
    // where a line should *start* once we know how wide the whole line is.
    // So instead of drawing immediately (like the old left-only version
    // did), each line is buffered here and only drawn once it's complete
    // (either it wraps, or a block/paragraph ends).
    let lineWords: { word: string; token: TextRun }[] = [];
    let lineWidth = 0;
    let lineAlign: Align = "left";

    const ensureSpace = (height: number) => {
      if (y + height > pageHeight - marginY) {
        doc.addPage();
        y = marginY;
      }
    };

    const fontStyleFor = (token: TextRun) =>
      token.bold && token.italic
        ? "bolditalic"
        : token.bold
        ? "bold"
        : token.italic
        ? "italic"
        : "normal";

    const measure = (word: string, token: TextRun) => {
      doc.setFont(token.font, fontStyleFor(token));
      doc.setFontSize(token.size);
      return doc.getTextWidth(word);
    };

    const flushLine = () => {
      if (lineWords.length === 0) {
        y += lineHeight;
        lineHeight = BASE_LINE_HEIGHT;
        return;
      }

      // Drop a single trailing space so it doesn't skew the alignment math.
      const last = lineWords[lineWords.length - 1];
      if (/^\s+$/.test(last.word)) {
        lineWords = lineWords.slice(0, -1);
        lineWidth -= measure(last.word, last.token);
      }

      ensureSpace(lineHeight);

      let x = marginX;
      let gapBonus = 0;

      if (lineAlign === "center") {
        x = marginX + Math.max(0, (maxWidth - lineWidth) / 2);
      } else if (lineAlign === "right") {
        x = marginX + Math.max(0, maxWidth - lineWidth);
      } else if (lineAlign === "justify") {
        const gaps = lineWords.filter((w) => /^\s+$/.test(w.word)).length;
        if (gaps > 0) {
          gapBonus = Math.max(0, (maxWidth - lineWidth) / gaps);
        }
      }

      lineWords.forEach(({ word, token }) => {
        const isSpace = /^\s+$/.test(word);
        const width = measure(word, token);

        doc.setTextColor(token.color[0], token.color[1], token.color[2]);
        doc.text(word, x, y);

        if (token.underline && !isSpace) {
          doc.setDrawColor(token.color[0], token.color[1], token.color[2]);
          doc.line(x, y + 2, x + width, y + 2);
        }

        x += width;
        if (isSpace && lineAlign === "justify") x += gapBonus;
      });

      y += lineHeight;
      lineHeight = BASE_LINE_HEIGHT;
      lineWords = [];
      lineWidth = 0;
      lineAlign = "left";
    };

    const drawImage = (token: ImageRun) => {
      flushLine();

      let w = token.width * PX_TO_PT;
      let h = token.height * PX_TO_PT;
      if (w > maxWidth) {
        const scale = maxWidth / w;
        w *= scale;
        h *= scale;
      }
      const MAX_HEIGHT = 480;
      if (h > MAX_HEIGHT) {
        const scale = MAX_HEIGHT / h;
        w *= scale;
        h *= scale;
      }

      ensureSpace(h);

      let x = marginX;
      if (token.align === "center") x = marginX + (maxWidth - w) / 2;
      if (token.align === "right") x = marginX + (maxWidth - w);

      try {
        doc.addImage(token.image, token.format, x, y, w, h);
        y += h + 10;
      } catch (err) {
        // A format jsPDF can't handle in this browser — skip just this
        // image rather than aborting the whole export.
        console.log("Couldn't embed image in PDF export", err);
      }
    };

    // Shapes map onto jsPDF's native drawing primitives (rect/circle/
    // ellipse/triangle/line) — everything is wrapped in one try/catch so
    // an unsupported method in a particular browser skips just that shape
    // rather than aborting the whole export.
    const drawShape = (token: ShapeRun) => {
      flushLine();

      let w = token.width * PX_TO_PT;
      let h = token.height * PX_TO_PT;
      const MAX_SIZE = 300;
      if (w > maxWidth) {
        const scale = maxWidth / w;
        w *= scale;
        h *= scale;
      }
      if (h > MAX_SIZE) {
        const scale = MAX_SIZE / h;
        w *= scale;
        h *= scale;
      }

      ensureSpace(h + 10);

      let x = marginX;
      if (token.align === "center") x = marginX + (maxWidth - w) / 2;
      if (token.align === "right") x = marginX + (maxWidth - w);

      try {
        const [r, g, b] = token.color;
        doc.setDrawColor(r, g, b);
        doc.setFillColor(r, g, b);
        doc.setLineWidth(1.2);

        switch (token.shape) {
          case "square":
          case "rectangle":
            doc.rect(x, y, w, h, "S");
            break;
          case "circle": {
            const radius = Math.min(w, h) / 2;
            doc.circle(x + w / 2, y + h / 2, radius, "S");
            break;
          }
          case "ellipse":
            doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, "S");
            break;
          case "triangle":
            doc.triangle(x + w / 2, y, x, y + h, x + w, y + h, "F");
            break;
          case "diamond": {
            // Two triangles meeting at the midline — avoids relying on a
            // less-common multi-point polygon API for a simple shape.
            const cx = x + w / 2;
            const cy = y + h / 2;
            doc.triangle(cx, y, x, cy, x + w, cy, "F");
            doc.triangle(cx, y + h, x, cy, x + w, cy, "F");
            break;
          }
          case "dashed":
            doc.setLineDashPattern([4, 3], 0);
            doc.line(x, y + h, x + w, y + h);
            doc.setLineDashPattern([], 0);
            break;
          case "line":
          default:
            doc.line(x, y + h, x + w, y + h);
            break;
        }

        y += h + 10;
      } catch (err) {
        console.log("Couldn't draw shape in PDF export", err);
      }
    };

    const drawTable = (token: TableRun) => {
      flushLine();

      const numCols = token.colWidths.length;
      if (numCols === 0 || token.cells.length === 0) return;

      const totalPxWidth = token.colWidths.reduce((a, b) => a + b, 0);
      const scale =
        totalPxWidth > 0 ? Math.min(1, maxWidth / (totalPxWidth * PX_TO_PT)) : 1;
      const colWidthsPt = token.colWidths.map((w) => Math.max(30, w * PX_TO_PT * scale));
      const tableWidth = colWidthsPt.reduce((a, b) => a + b, 0);
      const CELL_PAD = 5;

      let startX = marginX;
      if (token.align === "center") startX = marginX + Math.max(0, (maxWidth - tableWidth) / 2);
      if (token.align === "right") startX = marginX + Math.max(0, maxWidth - tableWidth);

      try {
        token.cells.forEach((row) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);

          const wrapped = row.map((text, colIndex) => {
            const colW = colWidthsPt[colIndex] ?? colWidthsPt[colWidthsPt.length - 1] ?? 60;
            return doc.splitTextToSize(text || " ", Math.max(10, colW - CELL_PAD * 2)) as string[];
          });
          const rowHeight = Math.max(
            18,
            ...wrapped.map((lines) => lines.length * 11 + CELL_PAD * 2)
          );

          ensureSpace(rowHeight);

          let cellX = startX;
          row.forEach((_, colIndex) => {
            const colW = colWidthsPt[colIndex] ?? colWidthsPt[colWidthsPt.length - 1] ?? 60;

            doc.setDrawColor(17, 17, 17);
            doc.setLineWidth(0.75);
            doc.rect(cellX, y, colW, rowHeight, "S");

            doc.setTextColor(17, 17, 17);
            const lines = wrapped[colIndex] || [];
            lines.forEach((line, i) => {
              doc.text(line, cellX + CELL_PAD, y + CELL_PAD + 8 + i * 11);
            });

            cellX += colW;
          });

          y += rowHeight;
        });

        y += 10;
      } catch (err) {
        console.log("Couldn't draw table in PDF export", err);
      }
    };

    tokens.forEach((token) => {
      if ("break" in token) {
        flushLine();
        return;
      }

      if ("image" in token) {
        drawImage(token);
        return;
      }

      if ("shape" in token) {
        drawShape(token);
        return;
      }

      if ("table" in token) {
        drawTable(token);
        return;
      }

      if (lineWords.length === 0) lineAlign = token.align;

      const words = token.text.split(/(\s+)/).filter((w) => w.length > 0);

      words.forEach((word) => {
        const isSpace = /^\s+$/.test(word);
        if (isSpace && lineWords.length === 0) return; // skip a leading space on a fresh line

        const width = measure(word, token);

        if (!isSpace && lineWidth + width > maxWidth && lineWords.length > 0) {
          flushLine();
          lineAlign = token.align;
        }

        lineHeight = Math.max(lineHeight, token.size * 1.3);
        lineWords.push({ word, token });
        lineWidth += width;
      });
    });

    flushLine();

    doc.save(`${safeFileName(workspace?.name || "document")}.pdf`);
  };

  const exportDoc = () => {
    const el = editorRef.current;
    if (!el) return;

    if (!(el.innerText || "").trim()) {
      alert("Write something in the document before exporting.");
      return;
    }

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

  const fileExtension = (name: string) =>
    name.split(".").pop()?.toLowerCase() || "";

  const DOC_LOADABLE_EXTENSIONS = ["doc", "docx", "txt", "md", "html", "htm"];

  const isDocLoadable = (file: SharedFile) =>
    DOC_LOADABLE_EXTENSIONS.includes(fileExtension(file.name));

  // Pulls a shared file's content into the collaborative document editor.
  // Files this app itself exported via "DOC" are just HTML under a
  // Word-compatible extension, so those load perfectly. Genuine binary
  // Word files (.doc/.docx from actual MS Word) aren't parsed — that needs
  // a real docx-parsing library, which isn't wired up here — so we detect
  // that case and tell the person plainly instead of dumping garbled bytes
  // into a shared, live-synced document everyone in the workspace sees.
  const handleLoadFileIntoDocument = async (file: SharedFile) => {
    const editor = editorRef.current;
    if (!editor) return;

    const ok = confirm(
      `Load "${file.name}" into the shared document? This replaces the current content for everyone in the workspace.`
    );
    if (!ok) return;

    try {
      const res = await downloadFileApi(file.id);
      const blob = new Blob([res.data]);
      const text = await blob.text();
      const ext = fileExtension(file.name);
      const looksLikeHtml = /^\s*(<!doctype html|<html)/i.test(text);

      if (looksLikeHtml) {
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        editor.innerHTML = bodyMatch ? bodyMatch[1] : text;
        handleEditorInput();
        return;
      }

      if (ext === "doc" || ext === "docx") {
        alert(
          "This looks like a real Word document rather than one exported from this app, so it can't be parsed here yet. Open it in Word or Google Docs, then copy and paste the text into the shared document instead."
        );
        return;
      }

      // Plain text (.txt, .md) — one <p> per line so breaks are preserved.
      const html = text
        .split(/\r?\n/)
        .map((line) => {
          const escaped = line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<p>${escaped || "<br>"}</p>`;
        })
        .join("");
      editor.innerHTML = html;
      handleEditorInput();
    } catch (err) {
      alert("Couldn't load that file into the document.");
    }
  };

  const handleInsertImageIntoDocument = async (file: SharedFile) => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const res = await downloadFileApi(file.id);
      const blob = new Blob([res.data], { type: file.mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") return;
        editor.focus();
        document.execCommand("insertImage", false, dataUrl);
        handleEditorInput();
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      alert("Couldn't insert that image into the document.");
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
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-card to-background px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <Link
              to="/dashboard"
              title="Back to dashboard"
              className="mt-1 h-9 w-9 rounded-xl bg-background ring-1 ring-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              <ArrowLeft size={17} />
            </Link>

            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {workspace?.name || "Loading..."}
              </h1>

              <button
                onClick={handleCopyInvite}
                className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground group"
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
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle className="h-9 w-9 rounded-xl bg-background ring-1 ring-border flex items-center justify-center hover:bg-accent transition-colors" />

            <div
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 ${
                connected ? "bg-muted" : "bg-amber-500/10"
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
                  connected ? "text-muted-foreground" : "text-amber-400"
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
        </div>

        {/* Live activity feed */}
        {activity.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activity.map((text, i) => (
              <span
                key={i}
                className="text-xs text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full animate-in fade-in slide-in-from-left-1"
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
          <div className="bg-card rounded-2xl ring-1 ring-border shadow-xl shadow-black/20 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border shrink-0">
              <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Users size={14} className="text-indigo-400" />
              </span>
              <h2 className="text-foreground font-semibold">Members</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                {members.length}
              </span>
            </div>

            <div className="p-3 space-y-1.5 overflow-y-auto flex-1">
              {members.map((member) => {
                const online = onlineUserIds.has(member.id);
                return (
                  <div
                    key={member.id}
                    className="rounded-xl p-2.5 flex items-center gap-3 hover:bg-accent transition-colors"
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
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                          online ? "bg-emerald-500" : "bg-gray-600"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">
                        {member.name}
                      </p>
                      <p className="text-muted-foreground text-xs truncate">
                        {online ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Files */}
          <div className="bg-card rounded-2xl ring-1 ring-border shadow-xl shadow-black/20 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <FolderOpen size={14} className="text-indigo-400" />
                </span>
                <h2 className="text-foreground font-semibold">Shared Files</h2>
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
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <FolderOpen size={28} className="opacity-30" />
                  <p className="text-sm text-center px-4">No files shared yet</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-muted rounded-xl p-3 flex items-start gap-3 hover:bg-accent transition-colors group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <FileTypeIcon mimeType={file.mimeType} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {formatSize(file.size)} · {file.uploader.name}
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {new Date(file.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                      {file.mimeType.startsWith("image/") && (
                        <button
                          onClick={() => handleInsertImageIntoDocument(file)}
                          className="text-muted-foreground hover:text-cyan-400"
                          title="Insert into document"
                        >
                          <ImageIcon size={15} />
                        </button>
                      )}

                      {isDocLoadable(file) && (
                        <button
                          onClick={() => handleLoadFileIntoDocument(file)}
                          className="text-muted-foreground hover:text-emerald-400"
                          title="Load into document"
                        >
                          <Import size={15} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDownload(file)}
                        className="text-muted-foreground hover:text-indigo-400"
                        title="Download"
                      >
                        <Download size={15} />
                      </button>

                      {(file.uploader.id === me.id ||
                        workspace?.ownerId === me.id) && (
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="text-muted-foreground hover:text-red-400"
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
        <div className="lg:col-span-6 bg-card rounded-2xl ring-1 ring-border shadow-xl shadow-black/20 flex flex-col overflow-hidden h-[520px] lg:h-[760px]">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border shrink-0">
            <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <FileText size={14} className="text-indigo-400" />
            </span>
            <h2 className="text-foreground font-semibold">Shared Document</h2>

            <span className="text-xs ml-auto flex items-center gap-3">
              {noteTypers.length > 0 && (
                <span className="text-indigo-400 italic">
                  {noteTypers.length === 1
                    ? `${noteTypers[0]} is editing...`
                    : `${noteTypers.length} people editing...`}
                </span>
              )}
              <span className="text-muted-foreground">
                {noteStatus === "saving" && "Saving..."}
                {noteStatus === "saved" && "Saved"}
              </span>
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted shrink-0 flex-wrap">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("undo")}
              className={toolbarBtn(false)}
              title="Undo"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("redo")}
              className={toolbarBtn(false)}
              title="Redo"
            >
              <Redo2 size={15} />
            </button>

            <span className="w-px h-6 bg-border mx-1" />

            <select
              defaultValue="P"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => applyFormat("formatBlock", e.target.value)}
              className="bg-background text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none ring-1 ring-transparent focus:ring-indigo-500 cursor-pointer"
              title="Paragraph style"
            >
              <option value="P">Normal text</option>
              <option value="H1">Heading 1</option>
              <option value="H2">Heading 2</option>
              <option value="H3">Heading 3</option>
            </select>

            <select
              defaultValue="Arial"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => applyFormat("fontName", e.target.value)}
              className="bg-background text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none ring-1 ring-transparent focus:ring-indigo-500 cursor-pointer"
              title="Font"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>

            <select
              defaultValue="3"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => applyFormat("fontSize", e.target.value)}
              className="bg-background text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none ring-1 ring-transparent focus:ring-indigo-500 cursor-pointer"
              title="Font size"
            >
              <option value="1">8pt</option>
              <option value="2">10pt</option>
              <option value="3">12pt</option>
              <option value="4">14pt</option>
              <option value="5">18pt</option>
              <option value="6">24pt</option>
              <option value="7">36pt</option>
            </select>

            <span className="w-px h-6 bg-border mx-1" />

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
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("strikeThrough")}
              className={toolbarBtn(activeFormats.strikeThrough)}
              title="Strikethrough"
            >
              <Strikethrough size={15} />
            </button>

            <label
              className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-accent transition-colors overflow-hidden relative"
              title="Text color"
            >
              <input
                type="color"
                defaultValue="#e5e7eb"
                onChange={(e) => applyFormat("foreColor", e.target.value)}
                className="opacity-0 absolute h-8 w-8 cursor-pointer"
              />
              <span className="text-xs font-bold text-foreground pointer-events-none">
                A
              </span>
            </label>

            <label
              className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-accent transition-colors overflow-hidden relative"
              title="Highlight color"
            >
              <input
                type="color"
                defaultValue="#fde047"
                onChange={(e) => applyFormat("hiliteColor", e.target.value)}
                className="opacity-0 absolute h-8 w-8 cursor-pointer"
              />
              <span className="text-xs font-bold text-foreground pointer-events-none border-b-2 border-current px-0.5">
                H
              </span>
            </label>

            <span className="w-px h-6 bg-border mx-1" />

            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("justifyLeft")}
              className={toolbarBtn(activeFormats.justifyLeft)}
              title="Align left"
            >
              <AlignLeft size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("justifyCenter")}
              className={toolbarBtn(activeFormats.justifyCenter)}
              title="Align center"
            >
              <AlignCenter size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("justifyRight")}
              className={toolbarBtn(activeFormats.justifyRight)}
              title="Align right"
            >
              <AlignRight size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("justifyFull")}
              className={toolbarBtn(activeFormats.justifyFull)}
              title="Justify"
            >
              <AlignJustify size={15} />
            </button>

            <span className="w-px h-6 bg-border mx-1" />

            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("insertUnorderedList")}
              className={toolbarBtn(activeFormats.insertUnorderedList)}
              title="Bullet list"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("insertOrderedList")}
              className={toolbarBtn(activeFormats.insertOrderedList)}
              title="Numbered list"
            >
              <ListOrdered size={15} />
            </button>

            <span className="w-px h-6 bg-border mx-1" />

            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={insertLink}
              className={toolbarBtn(false)}
              title="Insert link"
            >
              <Link2 size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => noteImageInputRef.current?.click()}
              className={toolbarBtn(false)}
              title="Insert image"
            >
              <ImageIcon size={15} />
            </button>
            <input
              ref={noteImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) insertImageFromFile(file);
                e.target.value = "";
              }}
            />

            <div className="relative flex items-center gap-1.5" ref={insertMenuRef}>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setOpenMenu(openMenu === "table" ? null : "table")}
                className={toolbarBtn(openMenu === "table")}
                title="Insert table"
              >
                <Table size={15} />
              </button>

              {openMenu === "table" && (
                <div className="absolute z-20 top-full mt-2 left-0 bg-card ring-1 ring-border rounded-xl shadow-xl p-4 w-56">
                  <p className="text-xs font-semibold text-foreground mb-3">
                    Insert table
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="flex-1">
                      <span className="block text-[11px] text-muted-foreground mb-1">
                        Rows
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={tableRows}
                        onChange={(e) => setTableRows(Number(e.target.value))}
                        className="w-full bg-background text-foreground text-sm rounded-lg px-2 py-1.5 outline-none ring-1 ring-border focus:ring-indigo-500"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="block text-[11px] text-muted-foreground mb-1">
                        Columns
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={tableCols}
                        onChange={(e) => setTableCols(Number(e.target.value))}
                        className="w-full bg-background text-foreground text-sm rounded-lg px-2 py-1.5 outline-none ring-1 ring-border focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={insertTable}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-medium py-2 rounded-lg"
                  >
                    Insert
                  </button>
                </div>
              )}

              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setOpenMenu(openMenu === "shape" ? null : "shape")}
                className={toolbarBtn(openMenu === "shape")}
                title="Insert shape"
              >
                <Square size={15} />
              </button>

              {openMenu === "shape" && (
                <div className="absolute z-20 top-full mt-2 left-0 bg-card ring-1 ring-border rounded-xl shadow-xl p-4 w-64">
                  <p className="text-xs font-semibold text-foreground mb-3">
                    Insert shape
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {SHAPE_DEFS.map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => insertShape(shape)}
                        title={shape.label}
                        className="h-12 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-foreground"
                      >
                        <span style={shape.previewStyle} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("insertHorizontalRule")}
              className={toolbarBtn(false)}
              title="Horizontal line"
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("removeFormat")}
              className={toolbarBtn(false)}
              title="Clear formatting"
            >
              <Eraser size={15} />
            </button>

            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={exportPdf}
                className="flex items-center gap-1.5 bg-background hover:bg-accent transition-colors text-foreground text-xs font-medium px-3 py-1.5 rounded-lg"
                title="Download as PDF"
              >
                <FileDown size={13} />
                PDF
              </button>
              <button
                type="button"
                onClick={exportDoc}
                className="flex items-center gap-1.5 bg-background hover:bg-accent transition-colors text-foreground text-xs font-medium px-3 py-1.5 rounded-lg"
                title="Download as Word document"
              >
                <FileDown size={13} />
                DOC
              </button>
            </span>
          </div>

          <div className="flex-1 min-h-0 relative">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onFocus={() => (isEditorFocused.current = true)}
              onBlur={() => (isEditorFocused.current = false)}
              onKeyUp={handleSelectionActivity}
              onMouseUp={handleEditorInput}
              onScroll={renderCursorOverlay}
              data-placeholder="Start typing — everyone in this workspace sees updates live, and it's saved automatically."
              className="h-full overflow-y-auto text-foreground text-sm leading-relaxed p-6 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-1 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1 [&_li]:my-0.5 [&_a]:text-indigo-400 [&_a]:underline [&_hr]:border-border [&_hr]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
            />
            <div
              ref={cursorLayerRef}
              className="absolute inset-0 pointer-events-none overflow-hidden"
            />
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-3 bg-card rounded-2xl ring-1 ring-border shadow-xl shadow-black/20 flex flex-col overflow-hidden h-[420px] lg:h-[760px]">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border shrink-0">
            <span className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <MessageSquare size={14} className="text-indigo-400" />
            </span>
            <h2 className="text-foreground font-semibold">Workspace Chat</h2>
          </div>

          <div className="flex-1 min-h-0 px-4 py-4 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
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
                          : "bg-secondary rounded-tl-sm"
                      }`}
                    >
                      {!isMe && (
                        <p className="text-xs font-semibold text-indigo-400 mb-0.5">
                          {msg.sender.name}
                        </p>
                      )}
                      <p
                        className={`text-sm leading-relaxed break-words ${
                          isMe ? "text-white" : "text-secondary-foreground"
                        }`}
                      >
                        {msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isMe ? "text-indigo-200/70" : "text-muted-foreground"
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
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" />
                </span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers.length} people are typing...`}
              </div>
            )}
          </div>

          <div className="flex gap-2 p-4 pt-2 border-t border-border shrink-0">
            <input
              className="flex-1 rounded-xl bg-muted text-foreground text-sm px-4 py-2.5 outline-none ring-1 ring-transparent focus:ring-indigo-500 transition-shadow placeholder:text-muted-foreground"
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