// DeepSeek response interceptor -- injected into chat.deepseek.com MAIN world.
// Activation pattern: hooks are installed at document_start but only capture
// when window.__apibeam_capturing === true (set by content script on ask_question).
// This ensures DeepSeek's own chat is never interfered with.
//
// SSE format (POST /api/v0/chat/completion):
//   event: ready / update_session / close
//   data: {"v":{"response":{...fragments...status:"WIP"...}}}  (snapshot)
//   data: {"p":"response/fragments/-1/content","o":"APPEND","v":" text"}  (patch)
//   data: {"v":" delta"}  (bare delta)
//   data: {"p":"response","o":"BATCH","v":[{sub-patches}]}  (batch)
//   data: {"p":"response/status","o":"SET","v":"FINISHED"}  (done)
(function () {
  if (window.__apibeam_loader_installed) return;
  window.__apibeam_loader_installed = true;
  console.log('[ApiBeam DeepSeek] loader installed');

  // ---- accumulator ----

  function createAccumulator() {
    let buffer = '';
    let posted = false;
    let fragments: { type: string; content: string; thinking: string }[] = [];
    let lastTarget: 'content' | 'thinking' = 'content';
    let quietTimer: number | null = null;

    function extractAndParseJson(str: string, fallback: any = null) {
      if (typeof str !== 'string') return fallback;
      const cleaned = str.replace(/```json\s*/gi, '').replace(/```/g, '');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return fallback;
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return fallback;
      }
    }

    function postResult() {
      if (posted) return;
      posted = true;
      if (quietTimer !== null) {
        clearTimeout(quietTimer);
        quietTimer = null;
      }
      const fullAssistantMessage = fragments
        .filter((f) => f.type === 'RESPONSE')
        .map((f) => f.content)
        .join('');
      console.log(
        '[ApiBeam DeepSeek] Captured response:',
        JSON.stringify(fullAssistantMessage).substring(0, 300)
      );
      const parsed = extractAndParseJson(fullAssistantMessage);
      let toSend: any = parsed;
      if (!parsed) {
        // Fallback: wrap raw text in OpenAI-compatible JSON so SDKs always get an object
        toSend = {
          id: 'chatcmpl-' + Math.random().toString(36).substring(2, 15),
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'deepseek-chat',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: fullAssistantMessage },
              finish_reason: 'stop',
            },
          ],
        };
        console.log('[ApiBeam DeepSeek] No JSON found, wrapping raw text in OpenAI format');
      } else {
        console.log('[ApiBeam DeepSeek] Extracted JSON:', JSON.stringify(parsed).substring(0, 300));
      }
      window.postMessage({ __apibeam_result: toSend, data: toSend }, '*');
    }

    function armQuietTimeout() {
      if (quietTimer !== null) clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        console.log('[ApiBeam DeepSeek] Stream idle, posting partial result');
        postResult();
      }, 15000);
    }

    function applyPatch(path: string, op: string, value: any) {
      const segs = path.split('/');
      if (segs[0] !== 'response' || segs[1] !== 'fragments') return;

      if (segs.length === 2 && op === 'APPEND' && value && typeof value === 'object') {
        fragments.push({
          type: value.type || 'RESPONSE',
          content: typeof value.content === 'string' ? value.content : '',
          thinking: typeof value.thinking_content === 'string' ? value.thinking_content : '',
        });
        lastTarget = 'content';
        return;
      }

      const index = segs[2] === '-1' ? fragments.length - 1 : parseInt(segs[2], 10);
      const frag = fragments[index];
      if (!frag) return;

      if (segs.length === 4 && segs[3] === 'content') {
        if (op === 'APPEND') frag.content += value;
        else if (op === 'SET') frag.content = value;
        lastTarget = 'content';
      } else if (segs.length === 4 && segs[3] === 'thinking_content') {
        if (op === 'APPEND') frag.thinking += value;
        else if (op === 'SET') frag.thinking = value;
        lastTarget = 'thinking';
      }
    }

    function handleBlock(block: string): boolean {
      let eventName: string | null = null;
      const lines = block.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          const dataStr = line.substring(5).trim();
          if (dataStr === '[DONE]') {
            postResult();
            return false;
          }
          try {
            const obj = JSON.parse(dataStr);

            if (
              obj.v &&
              typeof obj.v === 'object' &&
              obj.v.response &&
              Array.isArray(obj.v.response.fragments)
            ) {
              fragments = obj.v.response.fragments.map((f: any) => ({
                type: f.type || 'RESPONSE',
                content: typeof f.content === 'string' ? f.content : '',
                thinking: typeof f.thinking_content === 'string' ? f.thinking_content : '',
              }));
              lastTarget = 'content';
              if (obj.v.response.status && obj.v.response.status !== 'WIP') {
                postResult();
                return false;
              }
            } else if (obj.p && obj.o === 'BATCH' && Array.isArray(obj.v)) {
              for (const sub of obj.v) {
                if (sub && sub.p) applyPatch(sub.p, sub.o || 'SET', sub.v);
              }
            } else if (obj.p && obj.v) {
              applyPatch(obj.p, obj.o, obj.v);
            } else if (typeof obj.v === 'string') {
              const frag = fragments[fragments.length - 1];
              if (frag) {
                if (lastTarget === 'thinking') frag.thinking += obj.v;
                else frag.content += obj.v;
              }
            }
          } catch {
            // skip non-JSON
          }
        }
      }
      if (eventName === 'close') {
        postResult();
        return false;
      }
      return true;
    }

    function feed(rawText: string): boolean {
      buffer += rawText;
      armQuietTimeout();
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() as string;
      for (const part of parts) {
        const block = part.trim();
        if (!block) continue;
        if (!handleBlock(block)) return false;
      }
      return true;
    }

    function done() {
      if (quietTimer !== null) {
        clearTimeout(quietTimer);
        quietTimer = null;
      }
      postResult();
    }

    return { feed, done };
  }

  // ---- activation listener ----
  // Content script posts {__apibeam_start: true} when ask_question arrives.
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.__apibeam_start) {
      console.log('[ApiBeam DeepSeek] capture activated');
      window.__apibeam_capturing = true;
      window.__apibeam_capturing_timer = window.setTimeout(() => {
        window.__apibeam_capturing = false;
      }, 65000);
    }
  });

  // ---- fetch interception (always installed, only captures when active) ----
  const originalFetch = window.fetch;
  (window as any).fetch = async function (...args: any[]) {
    const response = await originalFetch.apply(this, args);

    if (!window.__apibeam_capturing) return response;

    const input = args[0];
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
        ? input.url
        : input instanceof URL
        ? input.href
        : '';

    if (!url.includes('/api/v0/chat/completion')) return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) return response;

    console.log('[ApiBeam DeepSeek] intercepting SSE:', url);

    const clone = response.clone();
    const reader = clone.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    const acc = createAccumulator();

    (async () => {
      try {
        while (reader) {
          const { done: readDone, value } = await reader.read();
          if (readDone) break;
          if (!acc.feed(decoder.decode(value, { stream: true }))) return;
        }
        acc.done();
      } catch (err) {
        console.error('[ApiBeam DeepSeek] SSE read error:', err);
      }
    })();

    return response;
  };

  // ---- XHR interception (always installed, only captures when active) ----
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: any) {
    (this as any).__apibeamUrl = String(url);
    return originalXhrOpen.apply(this, arguments as any);
  };

  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args: any[]) {
    if (!window.__apibeam_capturing) {
      return originalXhrSend.apply(this, args);
    }
    const url = String((this as any).__apibeamUrl || '');
    if (url.includes('/api/v0/chat/completion')) {
      console.log('[ApiBeam DeepSeek] completion XHR called:', url);
      const xhr = this;
      const acc = createAccumulator();
      let lastLen = 0;
      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState >= 3 && xhr.status === 200) {
          const text = (xhr as any).responseText || '';
          if (text.length > lastLen) {
            if (!acc.feed(text.substring(lastLen))) return;
            lastLen = text.length;
          }
        }
      });
      xhr.addEventListener('loadend', () => acc.done());
    }
    return originalXhrSend.apply(this, args);
  };
})();
