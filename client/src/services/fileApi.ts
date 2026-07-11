import api from "./api";

export const uploadFile = (serverId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post(`/file/${serverId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getFiles = (serverId: number) => {
  return api.get(`/file/${serverId}`);
};

export const deleteFile = (fileId: number) => {
  return api.delete(`/file/${fileId}`);
};