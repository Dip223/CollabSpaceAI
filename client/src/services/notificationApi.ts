import api from "./api";

// ================= GET NOTIFICATIONS =================

export const getNotifications = async () => {
  const res = await api.get("/notifications");
  return res.data;
};

// ================= UNREAD COUNT =================

export const getUnreadCount = async () => {
  const res = await api.get("/notifications/unread-count");
  return res.data;
};

// ================= MARK ALL AS READ =================

export const markAllRead = async () => {
  const res = await api.put("/notifications/read");
  return res.data;
};