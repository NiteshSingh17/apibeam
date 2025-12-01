import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

const API_BASE_URL = "https://apibeam.bitsmall.in/";
const chatgptBaseUrl = "https://chat.openai.com/chat";

export type SettingsSchema = {
  language: string;
  method: string;
  roomId: string;
};

let socketConnectionStatus: {
  status: "pending" | "connected" | "failed" | "disconnected";
  errorMessage?: string;
} = {
  status: "disconnected",
  errorMessage: undefined,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({ url: "src/pages/settings/index.html" });
});

const createNewRoom = () => {
  const roomId =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  chrome.storage.local.set({ roomId: roomId }, function () {
    return roomId;
  });
  return roomId;
};

const getRoomId = () => {
  return new Promise((res) => {
    chrome.storage.local.get("roomId", function (settings) {
      let roomId;
      if (settings?.roomId) {
        roomId = settings.roomId;
      } else {
        roomId = createNewRoom();
      }
      res(roomId);
    });
  });
};

const getConnectUrl = async () => {
  const roomId = await getRoomId();
  return `${API_BASE_URL}app/${roomId}`;
};

getRoomId();

let tabId: undefined | number;
let socket: Socket | undefined;

function connectWS() {
  try {
    socketConnectionStatus.errorMessage = "";
    socketConnectionStatus.status = "pending";
    chrome.runtime.sendMessage({
      type: "get_connection_status",
      content: socketConnectionStatus,
    });
    socket = io(API_BASE_URL, {
      transports: ["websocket"], // IMPORTANT for stability
      reconnection: true,
      reconnectionAttempts: 3,
    });

    socket.on("connect", async () => {
      const roomId = await getRoomId();
      socketConnectionStatus.status = "connected";
      socketConnectionStatus.errorMessage = "";
      chrome.runtime.sendMessage({
        type: "get_connection_status",
        content: socketConnectionStatus,
      });
      await fetch(`${API_BASE_URL}connect/${roomId}?socketId=${socket?.id}`);
    });

    socket.on("disconnect", () => {
      disconnectWS();
      console.log("[BG] Disconnected");
    });

    socket.on("connect_error", (err) => handleErrorOnConnect(err));
    socket.on("connect_failed", (err) => handleErrorOnConnect(err));

    socket.on("serverMessage", async (msg) => {
      console.log("serverMessage ", msg);
      const sendMessageToTab = (id: number) => {
        console.log("sendMessageToTab ", id);
        chrome.tabs.sendMessage(id, {
          type: "ask_question",
          content: msg,
        });
      };
      const tabDetails = tabId
        ? await chrome.tabs.get(tabId).catch(console.log)
        : null;
      if (!tabDetails || !tabId) {
        chrome.tabs.create(
          {
            url: chatgptBaseUrl,
            active: true,
          },
          (tab) => {
            tabId = tab.id;
            setTimeout(() => {
              if (tabId) {
                sendMessageToTab(tabId);
              }
            }, 3000);
          }
        );
      } else {
        sendMessageToTab(tabId);
      }
    });
  } catch (e: any) {
    console.log("Catch error ", e);
    handleErrorOnConnect(e);
  }
}

const disconnectWS = () => {
  socket?.disconnect();
  socket = undefined;
  socketConnectionStatus.status = "disconnected";
  socketConnectionStatus.errorMessage = undefined;
  chrome.runtime.sendMessage({
    type: "get_connection_status",
    content: socketConnectionStatus,
  });
};

const handleErrorOnConnect = (err: any) => {
  console.log("handleErrorOnConnect ", err);
  socketConnectionStatus.status = "disconnected";
  socketConnectionStatus.errorMessage = err.message;
  chrome.runtime.sendMessage({
    type: "get_connection_status",
    content: socketConnectionStatus,
  });
};

type AgentMessage = {
  type: "question_answer" | "set_settings" | "get_settings" | "get_connect_url";
  content: string | SettingsSchema;
};

chrome.runtime.onMessage.addListener(
  async (msg: AgentMessage, _sender, sendResponse) => {
    const tabId = _sender.tab?.id;
    console.log("msgmsgmsg ", msg);
    if (msg.type === "question_answer") {
      const roomId = await getRoomId();
      socket?.emit("clientResponse", { roomId, message: msg.content });
    } else if (msg.type === "set_settings") {
      chrome.storage.local.set({ settings: msg.content }, function () {});
    } else if (msg.type === "get_settings") {
      if (tabId) {
        chrome.storage.local.get("settings", function (result) {
          chrome.tabs.sendMessage(tabId, {
            type: "set_settings",
            content: result.settings,
          });
        });
      }
    } else if (msg.type === "get_connect_url") {
      if (tabId) {
        getConnectUrl().then(function (url) {
          chrome.tabs.sendMessage(tabId, {
            type: "set_connect_url",
            content: url,
          });
        });
      }
    } else if (msg.type === "connect") {
      connectWS();
    } else if (msg.type === "disconnect") {
      disconnectWS();
    } else if (msg.type === "get_connection_status") {
      chrome.runtime.sendMessage({
        type: "get_connection_status",
        content: socketConnectionStatus,
      });
    }
    return true; // Keep async messaging alive
  }
);
