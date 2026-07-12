import api from "./api";
import type {
  CreateServerRequest,
  JoinServerRequest,
  MyServersResponse,
} from "../types/server";

export const getMyServers = async (): Promise<MyServersResponse> => {
  const res = await api.get("/server/my");
  return res.data;
};

export const createServer = async (
  data: CreateServerRequest
) => {
  const res = await api.post("/server/create", data);
  return res.data;
};

export const joinServer = async (
  data: JoinServerRequest
) => {
  const res = await api.post("/server/join", data);
  return res.data;
};