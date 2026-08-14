// z.ai SSE fetch interceptor -- injected into chat.z.ai page world
// z.ai SSE format (standard "data:" prefix):
//   data: {"type":"chat:completion","data":{"delta_content":"...","phase":"thinking"}}
//   data: {"type":"chat:completion","data":{"delta_content":"...","phase":"answer"}}
//   data: {"type":"chat:completion","data":{"phase":"done","done":true}}
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

        // Split by double newline (SSE event separator)
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() as string;

        for (let part of parts) {
          part = part.trim();
          if (!part) continue;

          // Standard SSE: lines start with "data:"
          const lines = part.split(/\r?\n/);
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.substring(5).trim(); // 'data:'.length === 5
            if (dataStr === '[DONE]') continue;

            try {
              const obj = JSON.parse(dataStr);

              // z.ai format: { type: "chat:completion", data: { delta_content: "...", phase: "..." } }
              if (obj.type === 'chat:completion' && obj.data) {
                // Only collect answer deltas; skip the "thinking" reasoning phase
                if (
                  typeof obj.data.delta_content === 'string' &&
                  obj.data.phase !== 'thinking'
                ) {
                  fullAssistantMessage += obj.data.delta_content;
                }
                // If phase is "done", stream is complete
                if (obj.data.phase === 'done' || obj.data.done === true) {
                  console.log('[ApiBeam z.ai] Stream complete');
                }
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }

      console.log('[ApiBeam z.ai] Captured response:', fullAssistantMessage.substring(0, 200));

      function extractAndParseJson(str: string, fallback: any = null) {
        if (typeof str !== 'string') return fallback;

        const tryParse = (candidate: string) => {
          try {
            return JSON.parse(candidate);
          } catch {
            return undefined;
          }
        };

        // 1. Fast path: the whole message is valid JSON
        const direct = tryParse(str.trim());
        if (direct !== undefined) return direct;

        // 2. Strip markdown code fences (```json ... ```)
        const fenced = str.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) {
          const fencedParsed = tryParse(fenced[1].trim());
          if (fencedParsed !== undefined) return fencedParsed;
        }

        // 3. Greedy object match (first "{" to last "}")
        const greedy = str.match(/\{[\s\S]*\}/);
        if (greedy) {
          const greedyParsed = tryParse(greedy[0]);
          if (greedyParsed !== undefined) return greedyParsed;
        }

        // 4. Scan every "{...}" span and keep the largest valid JSON object
        let best: any = undefined;
        let bestLen = 0;
        for (let i = 0; i < str.length; i++) {
          if (str[i] !== '{') continue;
          for (let j = str.length - 1; j > i; j--) {
            if (str[j] !== '}') continue;
            const candidate = str.slice(i, j + 1);
            const parsed = tryParse(candidate);
            if (parsed !== undefined && candidate.length > bestLen) {
              best = parsed;
              bestLen = candidate.length;
            }
          }
        }

        return best !== undefined ? best : fallback;
      }

      const parsed = extractAndParseJson(fullAssistantMessage);
      window.postMessage(
        { data: parsed ?? fullAssistantMessage },
        '*'
      );
    }

    readStream().catch((err) => console.error('[ApiBeam z.ai] SSE read error:', err));
    return response;
  };
})();
