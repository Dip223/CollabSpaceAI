import { io } from "socket.io-client";

console.log("[socket] socket.io-client version check — see network tab");

const socket = io("http://localhost:5000", {
  autoConnect: false,
  auth: (cb) => {
    const token = localStorage.getItem("token");
    console.log("[socket] auth callback fired, token:", token);
    cb({ token });
  },
});

socket.on("connect_error", (err) => {
  console.log("[socket] connect_error:", err.message);
});

export default socket;