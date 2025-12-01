import React, { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink, Info, ExternalLinkIcon } from 'lucide-react';

export const ApiUrlSection = () => {
  const [copied, setCopied] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  const testApiUrl = apiUrl + '/test-me?message=how to use apis';

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'get_connect_url' });
    chrome.runtime.onMessage.addListener(
      (msg) => {
        if (msg.type === "set_connect_url") {
          setApiUrl(msg.content);
        } 
      }
    );
  },[])

  const handleCopy = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Your API URL</h2>
          <p className="text-gray-600 text-sm">Use this URL to connect your application to ApiBeam</p>
        </div>

        {/* API URL with Copy Button */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-gray-900">
            {apiUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check size={18} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

         {/* Header */}
        <div className="mb-4">
          <p className="text-gray-600 text-sm">Test it now</p>
        </div>

        {/* API URL with Copy Button */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-gray-900">
            {testApiUrl}
          </div>
          <button
            onClick={() => {
              window.open(testApiUrl, "_blank");
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg transition-colors"
          >
           <ExternalLinkIcon />
          </button>
        </div>

        

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-gray-900 mb-2">How to Use</h3>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>Copy the API URL above</li>
                <li>Paste it as the <code className="bg-white px-2 py-0.5 rounded text-blue-600 font-mono text-xs">base_url</code> parameter in your OpenAI client configuration</li>
                <li>Make sure your Chrome extension is running</li>
                <li>Start making requests!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-2 text-sm">Example Configuration</h3>
          <pre className="bg-white border border-gray-200 rounded p-3 overflow-x-auto">
            <code className="text-sm text-gray-800">
{`from openai import OpenAI

client = OpenAI(
    base_url="${apiUrl}",
    api_key="not-needed"
)`}
            </code>
          </pre>
        </div>

        {/* Documentation Link */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">Need more help with configuration?</p>
          <a
            href="https://github.com/openai/openai-python?tab=readme-ov-file#configuring-the-http-client"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            View Documentation
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};
