import { useCallback, useEffect } from 'react';
import { useMessageHandler } from '../../shared/useMessageHandler';

const findThinkingToggle = () => {
  const result = document.evaluate(
    "//button[.//span[normalize-space()='Think']]",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );

  return result.singleNodeValue as HTMLElement;
};

type ThinkingEffort = 'high' | 'off';

const dispatchPointerEvents = (el: Element) => {
  const rect = el.getBoundingClientRect();
  const types = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const;
  for (const t of types) {
    el.dispatchEvent(
      new PointerEvent(t, {
        bubbles: true,
        cancelable: true,
        clientX: rect.x + 5,
        clientY: rect.y + 5,
        button: 0,
      })
    );
  }
  (el as HTMLElement).click();
};

const clickThinkingToggle = (): boolean => {
  const toggle = findThinkingToggle();
  if (!toggle) return false;
  dispatchPointerEvents(toggle);
  return true;
};

const isThinkingToggleEnabled = (): boolean => {
  const toggle = findThinkingToggle();
  if (!toggle) return false;
  return toggle.getAttribute('aria-pressed') === 'true';
};

const resolveEffort = (req: ThinkingRequest): ThinkingEffort | null => {
  if (req === null) return 'off';
  const effort = req.effort;
  if (typeof effort === 'string') {
    const e = effort.toLowerCase();
    if (e === 'high') return 'high';
    return 'off';
  }
  return 'off';
};

type ThinkingRequest = { effort?: string | number | boolean | null; enabled?: boolean } | null;

const parseThinkingRequestBody = (body: object | undefined): ThinkingRequest => {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, undefined | { effort?: string }>;
  if(b?.reasoning && b.reasoning.effort){
    return { effort: b.reasoning['effort'] }
  }
  return { effort: 'off' }
};

const setThinking = async (req: ThinkingRequest): Promise<void> => {
  const effort = resolveEffort(req);
  if (effort === null) return;

  const thinkingEnabled = isThinkingToggleEnabled();
  if (effort === 'off') {
    if (thinkingEnabled) {
      clickThinkingToggle();
    }
    return;
  }

  if (effort === 'high' && !thinkingEnabled) {
    clickThinkingToggle();
  }
};

const waitForSendButton = (timeout = 5000): Promise<HTMLButtonElement | null> =>
  new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const btn = document.querySelector('#composer-submit-button') as HTMLButtonElement | null;
      if (btn && !btn.disabled) return resolve(btn);
      if (Date.now() - start > timeout) return resolve(btn);
      setTimeout(check, 250);
    };
    check();
  });

export const ChatGPT = () => {
  const sendToChat = useCallback(
    async (content: { route: string; body: object }, prompt: string, useTemporaryChat?: boolean) => {
      const thinkingReq = parseThinkingRequestBody(content.body);
      const inputElement = document.querySelector(
        '[name="prompt-textarea"]'
      ) as HTMLInputElement;
      const contentArea = document.querySelector(
        '#prompt-textarea'
      ) as HTMLDivElement;

      if (!inputElement || !contentArea) return;

      const text = ` ${prompt ? prompt + '\n' : ''}Route: ${content.route}\nPayload: ${JSON.stringify(content.body)}`;
      contentArea.innerHTML = text;
      inputElement.value = text;

      const submit = (delay: number) => {
        window.setTimeout(() => {
          const submitButton = document.querySelector(
            '#composer-submit-button'
          ) as HTMLButtonElement;
          if (submitButton) submitButton.click();
        }, delay);
      };

      if (thinkingReq) {
        await setThinking(thinkingReq);
        const btn = await waitForSendButton();
        if (btn) {
          btn.click();
        } else {
          submit(100);
        }
      } else {
        submit(100);
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