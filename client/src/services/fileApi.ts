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

// Returns a blob — the browser can't attach the JWT via a plain <a href>,
// so we fetch through axios (which does) and trigger the save manually.
export const downloadFile = (fileId: number) => {
  return api.get(`/file/${fileId}/download`, {
    responseType: "blob",
  });
};

export const deleteFile = (fileId: number) => {
  return api.delete(`/file/${fileId}`);
};