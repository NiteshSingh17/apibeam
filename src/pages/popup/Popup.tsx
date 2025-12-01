import React from "react";
import { ConnectButton } from "../settings/components/connect";
import { Settings } from "lucide-react";

export default function Popup() {
  const handleEditSetting = () => {
    chrome.tabs.create({ url: "src/pages/settings/index.html" });
  };

  return (
    <div className="pb-10">
      <ConnectButton popup />
      <div className="w-full flex justify-center">
        <button
          onClick={handleEditSetting}
          className={`flex-shrink-0 flex items-center gap-2 font-semibold py-3 px-6 rounded-lg transition-all duration-300 border border-gray-400 ${"hover:bg-gray-200 hover:shadow-lg"}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
