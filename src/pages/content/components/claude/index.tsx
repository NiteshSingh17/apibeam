import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';

// Waits for a selector to appear in DOM, then resolves
const waitForElement = (selector: string, timeout = 10000): Promise<Element | null> =>
  new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });

export const Claude = () => {
  const sendToChat = useCallback(
    async (content: { route: string; body: object }, prompt: string) => {
      console.log("Send to chatg", content, prompt);
      // Claude uses a ProseMirror contenteditable div
      const editor = await waitForElement('div[contenteditable="true"].ProseMirror') as HTMLElement
        ?? await waitForElement('div[contenteditable="true"]') as HTMLElement;
      console.log("Send editor", editor);

      if (!editor) {
        console.error('[ApiBeam Claude] Could not find Claude input editor');
        return;
      }

      const text = `${prompt ? prompt + '\n' : ''}Route: ${content.route}\nPayload: ${JSON.stringify(content.body)}`;

      // Set text in ProseMirror editor via execCommand (works in page world)
      editor.focus();
      editor.innerText = text;
      // Small delay then click Send
      window.setTimeout(async () => {
        // Claude's send button aria-label
        const sendBtn =
          (document.querySelector('button[aria-label="Send message"]') as HTMLButtonElement) ??
          (document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement);
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        } else {
          console.warn('[ApiBeam Claude] Send button not found or disabled');
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
    // Inject Claude loader into page world
    const newScript = document.createElement('script');
    newScript.src = chrome.runtime.getURL('loader-claude.js');
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
