export interface Server {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  createdAt: string;
}

export interface CreateServerRequest {
  name: string;
}

export interface JoinServerRequest {
  inviteCode: string;
}

export interface ServerResponse {
  server: Server;
}

export interface MyServersResponse {
  servers: Server[];
}