import api from "./api";

// ================= GET NOTE =================

export const getNote = async (
  serverId: number
) => {
  const res = await api.get(
    `/note/${serverId}`
  );

  return res.data;
};

// ================= SAVE NOTE =================

export const saveNote = async (
  serverId: number,
  content: string
) => {
  const res = await api.put(
    `/note/${serverId}`,
    {
      content,
    }
  );

  return res.data;
};