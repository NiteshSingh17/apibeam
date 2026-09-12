import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';

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

export const DeepSeek = () => {
  const sendToChat = useCallback(
    async (content: { route: string; body: object }, prompt: string) => {
      let editor = (await waitForElement(
        'textarea[placeholder*="deepseek" i]'
      )) as HTMLTextAreaElement | null;
      if (!editor) {
        editor = (await waitForElement(
          'textarea.ds-scroll-area'
        )) as HTMLTextAreaElement | null;
      }

      if (!editor) {
        console.error('[ApiBeam DeepSeek] Could not find DeepSeek input textarea');
        return;
      }

      const text = `${prompt ? prompt + '\n' : ''}Route: ${content.route}\nPayload: ${JSON.stringify(content.body)}`;

      editor.focus();

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

      // Signal the loader to start capturing BEFORE clicking send
      window.postMessage({ __apibeam_start: true }, '*');
      console.log('[ApiBeam DeepSeek] Sent capture start signal');

      const clickSend = () => {
        const sendBtn =
          (document.querySelector(
            'div[role="button"].ds-button--primary.ds-button--circle'
          ) as HTMLElement) ??
          (document.querySelector('button.ds-button--primary') as HTMLButtonElement);
        if (sendBtn && !sendBtn.classList.contains('ds-button--disabled')) {
          sendBtn.click();
          return true;
        }
        return false;
      };

      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 200));
        if (clickSend()) return;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
      console.warn('[ApiBeam DeepSeek] Send button not found or disabled');
    },
    []
  );

  const runLastScript = (json: any) => {
    if (json) {
      const preview = typeof json === 'string' ? json.substring(0, 300) : JSON.stringify(json)?.substring(0, 300);
      console.log('[ApiBeam DeepSeek] Forwarding response to background:', preview);
      chrome.runtime.sendMessage({ type: 'question_answer', content: json });
    } else {
      console.warn('[ApiBeam DeepSeek] Empty response data, not forwarding');
    }
  };

  useMessageHandler(sendToChat);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!event.data) return;
      const payload = event.data.__apibeam_result ?? event.data.data;
      if (typeof payload === 'undefined') return;

      console.log('[ApiBeam DeepSeek] Received captured response from loader');
      runLastScript(payload);

      // Deactivate capture
      window.__apibeam_capturing = false;
      if (window.__apibeam_capturing_timer) {
        clearTimeout(window.__apibeam_capturing_timer);
        window.__apibeam_capturing_timer = undefined;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return <div />;
};
