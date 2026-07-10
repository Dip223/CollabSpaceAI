import { useEffect, useState } from "react";
import { getMyServers } from "../services/serverService";
import { Server } from "../types/server";

export default function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  const loadServers = async () => {
    try {
      const data = await getMyServers();
      setServers(data.servers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  return {
    servers,
    loading,
    refresh: loadServers,
  };
}