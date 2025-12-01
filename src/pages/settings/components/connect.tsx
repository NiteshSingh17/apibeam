import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2, Check, Server, Zap } from "lucide-react";
import clsx from "clsx";

export const ConnectButton = ({ popup }: { popup?: boolean }) => {
  const [status, setStatus] = useState("disconnected"); // disconnected, pending, connected
  const [errorMessage, setErrorMessage] = useState("");
  const [networkSpeed, setNetworkSpeed] = useState({
    downlink: 0,
    effectiveType: "unknown",
  });
  const [serverName, setServerName] = useState("");

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "get_connect_url" });
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "get_connection_status" });
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "get_connection_status" && msg.content) {
        setStatus(msg.content.status);
        setErrorMessage(msg.content.errorMessage);
      } else if (msg.type === "set_connect_url") {
        setServerName(new URL(msg.content).hostname);
      }
    });
  }, []);

  useEffect(() => {
    // Get network information if available
    const connection: any =
      "connection" in navigator
        ? navigator.connection
        : "mozConnection" in navigator
        ? navigator.mozConnection
        : "webkitConnection" in navigator
        ? navigator.webkitConnection
        : null;

    const updateNetworkInfo = () => {
      if ("connection" in navigator) {
        if (connection) {
          setNetworkSpeed({
            downlink: connection.downlink || 0,
            effectiveType: connection.effectiveType || "unknown",
          });
        }
      }
    };

    updateNetworkInfo();

    // Listen for network changes
    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
      return () => connection.removeEventListener("change", updateNetworkInfo);
    }
  }, []);

  const formatSpeed = (mbps: number) => {
    if (mbps === 0) return "Calculating...";
    if (mbps >= 1) return `${mbps.toFixed(1)} Mbps`;
    return `${(mbps * 1000).toFixed(0)} Kbps`;
  };

  const getSpeedColor = (effectiveType: string) => {
    switch (effectiveType) {
      case "4g":
        return "text-green-600";
      case "3g":
        return "text-yellow-600";
      case "2g":
        return "text-orange-600";
      case "slow-2g":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getSpeedBgColor = (effectiveType: string) => {
    switch (effectiveType) {
      case "4g":
        return "bg-green-100";
      case "3g":
        return "bg-yellow-100";
      case "2g":
        return "bg-orange-100";
      case "slow-2g":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  const handleConnect = () => {
    if (status !== "connected") {
      chrome.runtime.sendMessage({ type: "connect" });
    } else {
      chrome.runtime.sendMessage({ type: "disconnect" });
    }
  };

  return (
    <div>
      <div
        className={clsx("bg-white rounded-lg p-6", {
          "border border-gray-200 shadow-sm": !popup,
        })}
      >
        <div
          className={clsx("flex items-center gap-6", {
            "flex-col": popup,
            "text-center": popup,
          })}
        >
          {/* Status Indicator */}
          <div className="flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                status === "connected"
                  ? "bg-green-100 border-4 border-green-500 animate-pulse"
                  : status === "pending"
                  ? "bg-blue-100 border-4 border-blue-500"
                  : "bg-gray-100 border-4 border-gray-300"
              }`}
            >
              {status === "connected" && (
                <Check className="text-green-600" size={32} strokeWidth={3} />
              )}
              {status === "pending" && (
                <Loader2 className="text-blue-600 animate-spin" size={32} />
              )}
              {status === "disconnected" && (
                <WifiOff className="text-gray-400" size={32} />
              )}
            </div>
          </div>

          {/* Status Info */}
          <div className="flex-1">
            <h2
              className={`text-xl font-semibold mb-1 transition-colors ${
                status === "connected"
                  ? "text-green-600"
                  : status === "pending"
                  ? "text-blue-600"
                  : "text-gray-900"
              }`}
            >
              {status === "connected" && "Connected"}
              {status === "pending" && "Connecting..."}
              {status === "disconnected" && "Disconnected"}
            </h2>
            <p className="text-gray-600 text-sm">
              {status === "connected" &&
                "Your ApiBeam connection is active and ready"}
              {status === "pending" &&
                "Establishing connection to ApiBeam server"}
              {status === "disconnected" &&
                "Click connect to start using ApiBeam"}
            </p>
            {errorMessage && (
              <p className="text-red-600 text-sm">{errorMessage}</p>
            )}
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={status === "pending"}
            className={`flex-shrink-0 flex items-center gap-2 font-semibold py-3 px-6 rounded-lg transition-all duration-300 ${
              status === "connected"
                ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
                : status === "pending"
                ? "bg-blue-600 text-white cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg"
            }`}
          >
            {status === "connected" && (
              <>
                <Wifi size={18} />
                <span>Disconnect</span>
              </>
            )}
            {status === "pending" && (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Connecting...</span>
              </>
            )}
            {status === "disconnected" && (
              <>
                <Wifi size={18} />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>

        {/* Connection Details */}
        {!popup
          ? status === "connected" && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                      <span className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        Status
                      </p>
                      <p className="text-sm text-gray-900 font-semibold">
                        Online
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <Server className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        Server
                      </p>
                      <p className="text-sm text-gray-900 font-mono font-semibold">
                        {serverName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg ${getSpeedBgColor(
                        networkSpeed.effectiveType
                      )}`}
                    >
                      <Zap
                        className={getSpeedColor(networkSpeed.effectiveType)}
                        size={20}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        Network Speed
                      </p>
                      <p
                        className={`text-sm font-semibold ${getSpeedColor(
                          networkSpeed.effectiveType
                        )}`}
                      >
                        {formatSpeed(networkSpeed.downlink)}
                        {networkSpeed.effectiveType !== "unknown" && (
                          <span className="text-xs ml-1 text-gray-500">
                            ({networkSpeed.effectiveType.toUpperCase()})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          : null}
      </div>
    </div>
  );
};
