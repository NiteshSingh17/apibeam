import { useEffect, useState } from "react";
import { Settings, Edit } from "lucide-react";
import { DEFAULT_API_BASE_URL } from "@src/pages/background";
import type { Provider } from "@src/pages/background";

interface Props {
  apiBaseUrl: string;
  onSave: (url: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export const CustomSettingsModal = ({ apiBaseUrl, onSave, onReset, onClose }: Props) => {
  const [editing, setEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiBaseUrl);
  const [provider, setProvider] = useState<Provider>("chatgpt");

  // Load current provider on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "get_provider" });
    const listener = (msg: any) => {
      if (msg.type === "set_provider") {
        setProvider(msg.content as Provider);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    chrome.runtime.sendMessage({ type: "set_provider", content: p });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Custom Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Provider selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Provider
          </label>
          <div className="flex gap-3">
            {(
              [
                { id: "chatgpt", label: "ChatGPT", icon: "🤖", sublabel: "chat.openai.com" },
                { id: "claude", label: "Claude", icon: "🟣", sublabel: "claude.ai" },
              ] as { id: Provider; label: string; icon: string; sublabel: string }[]
            ).map(({ id, label, icon, sublabel }) => (
              <button
                key={id}
                onClick={() => handleProviderChange(id)}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  provider === id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <span className="text-xl">{icon}</span>
                <div>
                  <p className={`text-sm font-medium ${provider === id ? "text-blue-700" : "text-gray-800"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-400">{sublabel}</p>
                </div>
                {provider === id && (
                  <span className="ml-auto text-blue-500 text-xs font-semibold">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-5" />

        {/* Custom API Base URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom API Base URL
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Override the default ApiBeam server. Paste your self-hosted server URL here.
          </p>

          {editing ? (
            <>
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://your-custom-api.com/"
                autoFocus
                className="w-full mb-3 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onSave(tempUrl);
                    setEditing(false);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setTempUrl(apiBaseUrl);
                    setEditing(false);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onReset();
                    setTempUrl(DEFAULT_API_BASE_URL);
                    setEditing(false);
                  }}
                  className="ml-auto bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium py-2 px-4 rounded-lg"
                >
                  Reset to Default
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-900 break-all min-h-[42px] flex items-center">
                {apiBaseUrl || (
                  <span className="text-gray-400 italic">Using default ApiBeam server</span>
                )}
              </div>
              <button
                onClick={() => {
                  setTempUrl(apiBaseUrl);
                  setEditing(true);
                }}
                className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
              >
                <Edit size={15} />
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
