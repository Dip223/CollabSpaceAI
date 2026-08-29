import api from "./api";

export const createWorkspace = (name: string) => {
  return api.post("/server/create", { name });
};

export const joinWorkspace = (inviteCode: string) => {
  return api.post("/server/join", {
    inviteCode,
  });
};

export const getMyWorkspaces = () => {
  return api.get("/server/my");
};

export const getWorkspace = (id: number) => {
  return api.get(`/server/${id}`);
};

export const getWorkspaceMembers = (id: number) => {
  return api.get(`/server/members/${id}`);
};

export const renameWorkspace = (id: number, name: string) => {
  return api.put(`/server/${id}`, { name });
};

export const removeMember = (id: number, userId: number) => {
  return api.delete(`/server/${id}/members/${userId}`);
};

export const leaveWorkspace = (id: number) => {
  return api.delete(`/server/${id}/leave`);
};