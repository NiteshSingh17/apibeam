// Claude SSE fetch interceptor — injected into claude.ai page world
// Claude streams SSE with events like:
//   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hello"}}
(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      return response;
    }

    const clone = response.clone();
    const reader = clone.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let fullAssistantMessage = '';

    async function readStream() {
      while (true) {
        if (!reader) return;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() as string;

        for (let part of parts) {
          part = part.trim();
          if (!part) continue;

          const lines = part.split(/\r?\n/);
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.substring('data:'.length).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const obj = JSON.parse(dataStr);
              // Claude format: { type: "content_block_delta", delta: { type: "text_delta", text: "..." } }
              if (
                obj.type === 'content_block_delta' &&
                obj.delta?.type === 'text_delta' &&
                typeof obj.delta?.text === 'string'
              ) {
                fullAssistantMessage += obj.delta.text;
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }

      // Try to extract JSON from the accumulated message
      function extractAndParseJson(str: string, fallback: any = null) {
        if (typeof str !== 'string') return fallback;
        const jsonMatch = str.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return fallback;
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return fallback;
        }
      }

      window.postMessage(
        { data: extractAndParseJson(fullAssistantMessage) },
        '*'
      );
    }

    readStream().catch((err) => console.error('[ApiBeam Claude] SSE read error:', err));
    return response;
  };
})();
