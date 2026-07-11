import api from "./api";

export const getMyWorkspaces = async () => {
  return api.get("/server/my");
};

export const createWorkspace = async (name: string) => {
  return api.post("/server/create", {
    name,
  });
};

export const joinWorkspace = async (inviteCode: string) => {
  return api.post("/server/join", {
    inviteCode,
  });
};

export const getWorkspace = async (id: number) => {
  return api.get(`/server/${id}`);
};

export const getWorkspaceMembers = async (id: number) => {
  return api.get(`/server/members/${id}`);
};