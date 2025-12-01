import { AgentAction } from "@src/pages/types";
import { useEffect, useRef, useState } from "react";

const createPrompt = (selectedLanguage: string, method: string) => {
  return `from now on talk to me with as i am taliking to chatgpt ${
    selectedLanguage ? `${selectedLanguage} library` : ""
  }${
    method ? ` which is using ${method}` : ""
  } you are server for it i will give you payload give me response in exact api json format block.`;
};

export const ChatGPT = () => {
  console.log("Chatgpt script loaded");
  const isIntialized = useRef(false);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [method, setMethod] = useState("");
  const prompt = useRef(createPrompt(selectedLanguage, method));

  useEffect(() => {
    prompt.current = createPrompt(selectedLanguage, method);
  }, [selectedLanguage, method]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "get_settings" });
  }, []);

  const runLastSCript = (json: Object) => {
    if (json) {
      chrome.runtime.sendMessage({ type: "question_answer", content: json });
    }
  };

  const handleMessageListener = () => {
    chrome.runtime.onMessage.addListener(
      (msg: any, _sender, sendResponse) => {
        console.log("incomig message", msg);
        if (msg.type === "ask_question") {
          const inputElement = document.querySelector(
            '[name="prompt-textarea"]'
          ) as HTMLInputElement;
          const contentArea = document.querySelector(
            "#prompt-textarea"
          ) as HTMLDivElement;
          if (inputElement && contentArea) {
            const parsedJSON = ` ${isIntialized.current ? "" : prompt.current} \n
            Route: ${msg.content.route}\n
            Payload: ${JSON.stringify(msg.content.body)} }
                        `;
            isIntialized.current = true;
            contentArea.innerHTML = parsedJSON;
            inputElement.value = parsedJSON;
            window.setTimeout(() => {
              const submitButton = document.querySelector(
                "#composer-submit-button"
              ) as HTMLButtonElement;
              if (submitButton) submitButton?.click();
            }, 100);
          }
        } else if (msg.type === "set_settings") {
          setSelectedLanguage(msg.content.language);
          setMethod(msg.content.method);
        }
      }
    );
  };

  useEffect(() => {
    const myInspector = () => {
      const newScript = document.createElement("script");
      newScript.src = chrome.runtime.getURL("loader.js");
      const r = document.body.appendChild(newScript);
      newScript.onload = () => {
        window.addEventListener("message", (event) => {
          if (event.source !== window) return;
          const { data } = event.data || {};
          runLastSCript(data);
        });
        // newScript.remove();
      };
    };
    handleMessageListener();
    myInspector();
  }, []);

  return <div></div>;
};
