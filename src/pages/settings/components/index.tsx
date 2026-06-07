import { useEffect, useState } from "react";
import { Server, Code, Settings, Info, ArrowRightLeft, Chrome, GitBranch, Github, Edit } from "lucide-react";
import { ApiUrlSection } from "./apiUrl";
import { ConnectButton } from "./connect";

const languages = [
  { id: "nodejs", name: "Node.js", emoji: "🟢" },
  { id: "python", name: "Python", emoji: "🐍" },
  { id: "go", name: "Go", emoji: "🔷" },
  { id: "ruby", name: "Ruby", emoji: "💎" },
  { id: "php", name: "PHP", emoji: "🐘" },
];

export const SettingPage = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [method, setMethod] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [editingCustomUrl, setEditingCustomUrl] = useState(false);
  const [tempCustomUrl, setTempCustomUrl] = useState("");

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "get_settings" });
    chrome.runtime.sendMessage({ type: "get_api_base_url" });
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "set_settings" && msg.content) {
        setSelectedLanguage(msg.content.language);
        setMethod(msg.content.method);
      } else if (msg.type === "set_api_base_url" && msg.content) {
        setApiBaseUrl(msg.content);
      }
    });
  }, []);

  const saveSettings = () => {
    chrome.runtime.sendMessage({
      type: "set_settings",
      content: { language: selectedLanguage, method: method },
    });
  };

  const saveApiBaseUrl = (url?: string) => {
    chrome.runtime.sendMessage({
      type: "set_api_base_url",
      content: url ?? apiBaseUrl,
    });
  };

  const resetApiBaseUrl = () => {
    chrome.runtime.sendMessage({
      type: "set_api_base_url",
      content: "",
    });
    setApiBaseUrl("");
  };

  const selectedLang = languages.find((lang) => lang.id === selectedLanguage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="../../../icon-32.png"
              alt="ApiBeam Logo"
              className="w-16 h-16"
            />
            <h1 className="text-4xl font-bold text-gray-900">ApiBeam</h1>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">
              Bridge Your ChatGPT Account to Your Apps
            </p>
            <a target="_blank" href="https://github.com/NiteshSingh17/apibeam">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30px"
                height="30px"
                viewBox="0 0 20 20"
                version="1.1"
              >
                <title>github [#142]</title>
                <desc>Created with Sketch.</desc>
                <defs></defs>
                <g
                  id="Page-1"
                  stroke="none"
                  stroke-width="1"
                  fill="none"
                  fill-rule="evenodd"
                >
                  <g
                    id="Dribbble-Light-Preview"
                    transform="translate(-140.000000, -7559.000000)"
                    fill="#000000"
                  >
                    <g id="icons" transform="translate(56.000000, 160.000000)">
                      <path
                        d="M94,7399 C99.523,7399 104,7403.59 104,7409.253 C104,7413.782 101.138,7417.624 97.167,7418.981 C96.66,7419.082 96.48,7418.762 96.48,7418.489 C96.48,7418.151 96.492,7417.047 96.492,7415.675 C96.492,7414.719 96.172,7414.095 95.813,7413.777 C98.04,7413.523 100.38,7412.656 100.38,7408.718 C100.38,7407.598 99.992,7406.684 99.35,7405.966 C99.454,7405.707 99.797,7404.664 99.252,7403.252 C99.252,7403.252 98.414,7402.977 96.505,7404.303 C95.706,7404.076 94.85,7403.962 94,7403.958 C93.15,7403.962 92.295,7404.076 91.497,7404.303 C89.586,7402.977 88.746,7403.252 88.746,7403.252 C88.203,7404.664 88.546,7405.707 88.649,7405.966 C88.01,7406.684 87.619,7407.598 87.619,7408.718 C87.619,7412.646 89.954,7413.526 92.175,7413.785 C91.889,7414.041 91.63,7414.493 91.54,7415.156 C90.97,7415.418 89.522,7415.871 88.63,7414.304 C88.63,7414.304 88.101,7413.319 87.097,7413.247 C87.097,7413.247 86.122,7413.234 87.029,7413.87 C87.029,7413.87 87.684,7414.185 88.139,7415.37 C88.139,7415.37 88.726,7417.2 91.508,7416.58 C91.513,7417.437 91.522,7418.245 91.522,7418.489 C91.522,7418.76 91.338,7419.077 90.839,7418.982 C86.865,7417.627 84,7413.783 84,7409.253 C84,7403.59 88.478,7399 94,7399"
                        id="github-[#142]"
                      ></path>
                    </g>
                  </g>
                </g>
              </svg>
            </a>
          </div>
        </div>

        <div className="mb-6">
          <ConnectButton />
        {/* Custom API Base URL Input */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">Custom API Base URL</h2>
          {editingCustomUrl ? (
            <>
              <input
                type="text"
                value={tempCustomUrl}
                onChange={(e) => setTempCustomUrl(e.target.value)}
                placeholder="https://your-custom-api.com/"
                className="w-full mb-3 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setApiBaseUrl(tempCustomUrl);
                    saveApiBaseUrl(tempCustomUrl);
                    setEditingCustomUrl(false);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setTempCustomUrl(apiBaseUrl);
                    setEditingCustomUrl(false);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resetApiBaseUrl();
                    setTempCustomUrl("");
                    setEditingCustomUrl(false);
                  }}
                  className="ml-auto bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-4 rounded-lg"
                >
                  Reset to Default
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-gray-900 text-sm break-all">
                {apiBaseUrl || <span className="text-gray-400 italic">Using default ApiBeam server</span>}
              </div>
              <button
                onClick={() => {
                  setTempCustomUrl(apiBaseUrl);
                  setEditingCustomUrl(true);
                }}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-3 rounded-lg transition-colors"
              >
                <Edit size={18} />
                <span>Edit</span>
              </button>
            </div>
          )}
        </div>
      </div>
        {/* How It Works Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <Info className="text-blue-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                How ApiBeam Works
              </h2>
              <p className="text-gray-600 leading-relaxed">
                ApiBeam acts as a middleware between your ChatGPT account and
                your client applications. Here's the flow:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <Code className="text-gray-700 mx-auto mb-2" size={28} />
              <p className="text-sm font-medium text-gray-900">
                Your Client App
              </p>
              <p className="text-xs text-gray-500 mt-1">Using library</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRightLeft className="text-gray-400" size={20} />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <Server className="text-gray-700 mx-auto mb-2" size={28} />
              <p className="text-sm font-medium text-gray-900">
                ApiBeam Server
              </p>
              <p className="text-xs text-gray-500 mt-1">Middleware</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRightLeft className="text-gray-400" size={20} />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <Chrome className="text-green-600 mx-auto mb-2" size={28} />
              <p className="text-sm font-medium text-gray-900">
                Chrome Extension
              </p>
              <p className="text-xs text-gray-500 mt-1">On your computer</p>
            </div>
          </div>

          <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-900">Step 1:</span> Pass
              ApiBeam's base URL to your library →
              <span className="font-semibold text-gray-900 ml-2">Step 2:</span>{" "}
              Request reaches our server →
              <span className="font-semibold text-gray-900 ml-2">Step 3:</span>{" "}
              Server sends command to Chrome extension →
              <span className="font-semibold text-gray-900 ml-2">Step 4:</span>{" "}
              Extension forwards to your ChatGPT account →
              <span className="font-semibold text-gray-900 ml-2">Step 5:</span>{" "}
              Response travels back through the same chain
            </p>
          </div>
        </div>
        <ApiUrlSection />
        {/* Settings Panel */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <Settings className="text-gray-700" size={24} />
              <h2 className="text-2xl font-semibold text-gray-900">
                Configuration
              </h2>
            </div>
            <div className="pt-2">
              For more accurate responses use the following configuration
            </div>
          </div>
          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Select Your Programming Language
            </label>
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 appearance-none cursor-pointer hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Language</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <span className="text-2xl">{selectedLang?.emoji}</span>
              </div>
            </div>

            {/* Language Icons Grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
              {languages.map((lang) => {
                return (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedLanguage(lang.id)}
                    className={`bg-white border-2 rounded-lg p-4 transition-all ${
                      selectedLanguage === lang.id
                        ? "border-blue-500 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-3xl block mx-auto">{lang.emoji}</span>
                    <p className="text-xs text-gray-700 mt-2 text-center font-medium">
                      {lang.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method Input */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
              <Code size={18} className="text-gray-600" />
              Library Method/Function Name
            </label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="e.g., client.responses.create"
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Button */}
          <button
            onClick={saveSettings}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Save Configuration
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6 text-gray-500 text-sm space-y-1">
          <p>
            🔒 Your ChatGPT messages stay secure on your computer. No data is
            sent to any third-party.
          </p>
        </div>
      </div>
    </div>
  );
};
