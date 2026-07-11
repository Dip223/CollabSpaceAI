import api from "./api";

// ================= GET ALL MESSAGES =================

export const getMessages = async (
  serverId: number
) => {
  const res = await api.get(
    `/message/${serverId}`
  );

  return res.data;
};

// ================= SEND MESSAGE =================

export const sendMessage = async (
  serverId: number,
  content: string
) => {
  const res = await api.post(
    `/message/${serverId}`,
    {
      content,
    }
  );

  return res.data;
};