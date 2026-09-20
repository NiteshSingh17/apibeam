import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';
import { waitForElement } from '../../shared/utils';


export const Zai = () => {
  const sendToChat = useCallback(
    async (content: { route: string; body: object }, prompt: string) => {
      const editor = await waitForElement('#chat-input') as HTMLTextAreaElement;

      if (!editor) {
        console.error('[ApiBeam z.ai] Could not find z.ai input textarea');
        return;
      }

      const text = `${prompt ? prompt + '\n' : ''}Route: ${content.route}\nPayload: ${JSON.stringify(content.body)}`;

      editor.focus();

      // Set value using native input setter to trigger React/Svelte change detection
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(editor, text);
      } else {
        editor.value = text;
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }));

      window.setTimeout(async () => {
        const sendBtn =
          (document.querySelector('#send-message-button') as HTMLButtonElement) ??
          (document.querySelector('button[type="submit"]') as HTMLButtonElement);
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        } else {
          console.warn('[ApiBeam z.ai] Send button not found or disabled');
        }
      }, 200);
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
    newScript.src = chrome.runtime.getURL('loader-zai.js');
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
