import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

// Default API base URL; can be overridden via chrome.storage "apiBaseUrl"
export const DEFAULT_API_BASE_URL = "https://apibeam.bitsmall.in/";
const chatgptBaseUrl = "https://chatgpt.com";
const claudeBaseUrl = "https://claude.ai/new";

export type Provider = 'chatgpt' | 'claude';

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

const getApiBaseUrl = async (): Promise<string> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiBaseUrl"], (result) => {
      const stored = result.apiBaseUrl as string;
      resolve(stored ? stored : DEFAULT_API_BASE_URL);
    });
  });
};

const getProvider = async (): Promise<Provider> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(["provider"], (result) => {
      resolve((result.provider as Provider) || "chatgpt");
    });
  });
};

const getProviderUrl = async (): Promise<string> => {
  const provider = await getProvider();
  return provider === "claude" ? claudeBaseUrl : chatgptBaseUrl;
};

const getConnectUrl = async () => {
  const roomId = await getRoomId();
  const base = await getApiBaseUrl();
  return `${base}app/${roomId}`;
};

getRoomId();

let tabId: undefined | number;
let socket: Socket | undefined;

const broadcastConnectionStatus = () => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "get_connection_status",
            content: socketConnectionStatus,
          },
          () => chrome.runtime.lastError // Ignore errors for tabs that don't listen
        );
      }
    });
  });
};

async function connectWS() {
  try {
    socketConnectionStatus.errorMessage = "";
    socketConnectionStatus.status = "pending";
    broadcastConnectionStatus();
    socket = io(await getApiBaseUrl(), {
      transports: ["websocket"], // IMPORTANT for stability
      reconnection: true,
      reconnectionAttempts: 3,
    });

    socket.on("connect", async () => {
      const roomId = await getRoomId();
      socketConnectionStatus.status = "connected";
      socketConnectionStatus.errorMessage = "";
      broadcastConnectionStatus();
      const base = await getApiBaseUrl();
      await fetch(`${base}connect/${roomId}?socketId=${socket?.id}`);
    });

    socket.on("disconnect", () => {
      disconnectWS();
      console.log("[BG] Disconnected");
    });

    socket.on("connect_error", (err) => handleErrorOnConnect(err));
    socket.on("connect_failed", (err) => handleErrorOnConnect(err));

    socket.on("serverMessage", async (msg) => {
      console.log("serverMessage", msg);
      const providerUrl = await getProviderUrl();
      
      // Helper to send message with retry logic
      const sendMessageToTabWithRetry = async (id: number, retries = 3, delay = 2000) => {
        try {
          const tab = await chrome.tabs.get(id);
          console.log("[BG] Tab found:", tab.url);
          if (tab) {
            console.log("[BG] Sending ask_question message to tab", id, "with content:", msg);
            chrome.tabs.sendMessage(id, {
              type: "ask_question",
              content: msg,
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log("[BG] Error sending message:", chrome.runtime.lastError);
                // Retry if content script not ready
                if (retries > 0 && chrome.runtime.lastError.message?.includes('Receiving end does not exist')) {
                  console.log(`[BG] Retrying in ${delay}ms... (${retries} retries left)`);
                  setTimeout(() => {
                    sendMessageToTabWithRetry(id, retries - 1, delay);
                  }, delay);
                }
              } else {
                console.log("[BG] Message sent successfully");
              }
            });
          }
        } catch (err) {
          console.log("[BG] Tab not found, creating new one. Error:", err);
          chrome.tabs.create(
            { url: providerUrl, active: true },
            (newTab) => {
              if (newTab.id) {
                tabId = newTab.id;
                console.log("[BG] New tab created with id:", newTab.id);
                // Wait longer for new tab content script to load
                setTimeout(() => {
                  if(newTab.id)
                  sendMessageToTabWithRetry(newTab.id, 3, 2000);
                }, 5000);
              }
            }
          );
        }
      };

      // Try to send to existing tab
      if (tabId) {
        sendMessageToTabWithRetry(tabId);
      } else {
        // No tab exists, create one
        chrome.tabs.create(
          { url: providerUrl, active: true },
          (tab) => {
            if (tab.id) {
              tabId = tab.id;
              console.log("[BG] New tab created with id:", tab.id);
              // Wait longer for new tab content script to load
              setTimeout(() => {
                if(tab.id)
                sendMessageToTabWithRetry(tab.id, 3, 2000);
              }, 5000);
            }
          }
        );
      }
    });
  } catch (e: any) {
    console.log("Catch error ", e);
    handleErrorOnConnect(e);
  }
}

const disconnectWS = () => {
  console.log("disconnectWS")
  socket?.disconnect();
  socket = undefined;
  socketConnectionStatus.status = "disconnected";
  socketConnectionStatus.errorMessage = undefined;
  broadcastConnectionStatus();
};

const handleErrorOnConnect = (err: any) => {
  console.log("handleErrorOnConnect ", err);
  socketConnectionStatus.status = "disconnected";
  socketConnectionStatus.errorMessage = err.message;
  broadcastConnectionStatus();
};

type AgentMessage = {
  type: "question_answer" | "set_settings" | "get_settings" | "get_connect_url";
  content: string | SettingsSchema;
};

chrome.runtime.onMessage.addListener(
  async (msg: AgentMessage, _sender, sendResponse) => {
    const tabId = _sender.tab?.id;
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
    } else if (msg.type === "get_connect_url" || msg.type === "get_api_base_url") {
      if (tabId) {
        const base = await getApiBaseUrl();
        const payload = msg.type === "get_connect_url" ? await getConnectUrl() : base;
        const responseType = msg.type === "get_connect_url" ? "set_connect_url" : "set_api_base_url";
        chrome.tabs.sendMessage(tabId, {
          type: responseType,
          content: payload,
        });
      }
    } else if (msg.type === "set_api_base_url") {
      // Store new API base URL
      const newUrl = msg.content as string;
      chrome.storage.local.set({ apiBaseUrl: newUrl }, async () => {
        console.log("API base URL updated to", newUrl);
        // Broadcast updated connect URL back to the settings tab so the UI updates instantly
        if (tabId) {
          disconnectWS();
          const updatedConnectUrl = await getConnectUrl();
          chrome.tabs.sendMessage(tabId, {
            type: "set_connect_url",
            content: updatedConnectUrl,
          });
        }
      });
    } else if (msg.type === "set_provider") {
      const provider = msg.content as Provider;
      chrome.storage.local.set({ provider }, () => {
        console.log("Provider set to", provider);
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            type: "set_provider",
            content: provider,
          });
        }
      });
    } else if (msg.type === "get_provider") {
      if (tabId) {
        const provider = await getProvider();
        chrome.tabs.sendMessage(tabId, {
          type: "set_provider",
          content: provider,
        });
      }
    } else if (msg.type === "connect") {
      connectWS();
    } else if (msg.type === "disconnect") {
      disconnectWS();
    } else if (msg.type === "get_connection_status") {
      sendResponse({
        type: "get_connection_status",
        content: socketConnectionStatus,
      });
    }
    return true; // Keep async messaging alive
  }
);
