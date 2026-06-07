import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';

export const ChatGPT = () => {
  const sendToChat = useCallback(
    (content: { route: string; body: object }, prompt: string) => {
      const inputElement = document.querySelector(
        '[name="prompt-textarea"]'
      ) as HTMLInputElement;
      const contentArea = document.querySelector(
        '#prompt-textarea'
      ) as HTMLDivElement;

      if (inputElement && contentArea) {
        const text = ` ${prompt ? prompt + '\n' : ''}Route: ${content.route}\nPayload: ${JSON.stringify(content.body)}`;
        contentArea.innerHTML = text;
        inputElement.value = text;
        window.setTimeout(() => {
          const submitButton = document.querySelector(
            '#composer-submit-button'
          ) as HTMLButtonElement;
          if (submitButton) submitButton.click();
        }, 100);
      }
    },
    []
  );

  const runLastScript = (json: object) => {
    if (json) {
      chrome.runtime.sendMessage({ type: 'question_answer', content: json });
    }
  };

  useMessageHandler(sendToChat);

  useEffect(() => {
    const newScript = document.createElement('script');
    newScript.src = chrome.runtime.getURL('loader.js');
    document.body.appendChild(newScript);
    newScript.onload = () => {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        const { data } = event.data || {};
        runLastScript(data);
      });
    };
  }, []);

  return <div />;
};
