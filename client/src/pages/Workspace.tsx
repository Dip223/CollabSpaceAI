import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getWorkspace,
  getWorkspaceMembers,
} from "../services/serverApi";

import {
  getMessages,
  sendMessage as saveMessage,
} from "../services/messageApi";

import socket from "../socket/socket";

interface WorkspaceType {
  id: number;
  name: string;
  inviteCode: string;
}

interface Member {
  id: number;
  name: string;
  email: string;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;

  sender: {
    id: number;
    name: string;
    email: string;
  };
}

export default function Workspace() {
  const { id } = useParams();

  const [workspace, setWorkspace] =
    useState<WorkspaceType | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [message, setMessage] =
    useState("");

  const [typing, setTyping] =
    useState("");

  const bottomRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {

    loadWorkspace();

    socket.connect();

    socket.emit(
      "join-workspace",
      Number(id)
    );

    socket.on(
      "receive-message",
      (data: Message) => {

        setMessages((prev) => [
          ...prev,
          data,
        ]);

      }
    );

    socket.on(
      "typing",
      (data: { user: string }) => {

        setTyping(
          `${data.user} is typing...`
        );

        setTimeout(() => {
          setTyping("");
        }, 1000);

      }
    );

    return () => {

      socket.emit(
        "leave-workspace",
        Number(id)
      );

      socket.off("receive-message");
      socket.off("typing");

      socket.disconnect();

    };

  }, [id]);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages]);

  const loadWorkspace = async () => {
  try {

    const workspaceRes =
      await getWorkspace(Number(id));

    setWorkspace(
      workspaceRes.data.server
    );

    const memberRes =
      await getWorkspaceMembers(Number(id));

    setMembers(
      memberRes.data.members
    );

    // Load old messages from database
    const oldMessages =
      await getMessages(Number(id));

    setMessages(oldMessages);

  } catch (err) {

    console.log(err);

  }
};

const sendMessage = async () => {

  if (!message.trim()) return;

  try {

    // Save message into database
    const saved =
      await saveMessage(
        Number(id),
        message
      );

    // Send realtime message
    socket.emit(
      "send-message",
      saved
    );

    setMessage("");

  } catch (err) {

    console.log(err);

  }

};

const handleTyping = (
  e: React.ChangeEvent<HTMLInputElement>
) => {

  setMessage(e.target.value);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  socket.emit(
    "typing",
    {
      workspaceId: Number(id),
      user: user.name,
    }
  );

};

return (
  <div className="min-h-screen bg-[#313338] p-8">

    <h1 className="text-4xl font-bold text-white">
      {workspace?.name}
    </h1>

    <p className="text-gray-400 mt-2">
      Invite Code :
      <span className="text-indigo-400 ml-2 font-semibold">
        {workspace?.inviteCode}
      </span>
    </p>

    <div className="grid grid-cols-4 gap-6 mt-10">

      {/* Members */}

      <div className="bg-[#2b2d31] rounded-xl p-5">

        <h2 className="text-white text-xl font-bold mb-5">
          Members
        </h2>

        <div className="space-y-3">

          {members.map((member) => (

            <div
              key={member.id}
              className="bg-[#1e1f22] rounded-lg p-3"
            >

              <p className="text-white font-semibold">
                {member.name}
              </p>

              <p className="text-gray-400 text-sm">
                {member.email}
              </p>

            </div>

          ))}

        </div>

      </div>

      {/* Chat */}

      <div className="col-span-2 bg-[#2b2d31] rounded-xl p-5 flex flex-col">

        <h2 className="text-white text-xl font-bold">
          Workspace Chat
        </h2>

        <div
          className="flex-1 mt-5 bg-[#1e1f22] rounded-lg p-4 overflow-y-auto space-y-3"
          style={{ height: "500px" }}
        >

          {messages.length === 0 ? (

            <p className="text-center text-gray-500 mt-10">
              No messages yet...
            </p>

          ) : (

            messages.map((msg) => (

              <div
                key={msg.id}
                className={`rounded-lg p-3 max-w-[80%] ${
                  msg.sender.name ===
                  JSON.parse(
                    localStorage.getItem("user") || "{}"
                  ).name
                    ? "bg-indigo-600 ml-auto"
                    : "bg-[#2b2d31]"
                }`}
              >

                <p className="font-semibold text-white">
                  {msg.sender.name}
                </p>

                <p className="text-white mt-1">
                  {msg.content}
                </p>

                <p className="text-xs text-gray-300 mt-2">
                  {new Date(
                    msg.createdAt
                  ).toLocaleTimeString()}
                </p>

              </div>

            ))

          )}

          <div ref={bottomRef}></div>

        </div>

        <p className="text-gray-400 h-6 mt-2">
          {typing}
        </p>

        <div className="flex gap-3 mt-2">

          <input
            className="flex-1 rounded-lg bg-[#1e1f22] text-white p-3 outline-none"
            placeholder="Type a message..."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-lg text-white"
          >
            Send
          </button>

        </div>

      </div>

            {/* Files */}

      <div className="bg-[#2b2d31] rounded-xl p-5">

        <h2 className="text-white text-xl font-bold">
          Shared Files
        </h2>

        <div
          className="mt-5 h-[500px] bg-[#1e1f22] rounded-lg flex justify-center items-center text-gray-500"
        >
          File Upload Coming Next...
        </div>

      </div>

    </div>

  </div>

);

}