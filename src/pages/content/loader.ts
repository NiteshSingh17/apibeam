(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      return response;
    }

    // Clone the response so page continues to work
    const clone = response.clone();
    const reader = clone.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let fullAssistantMessage = "";
    let doc: any = null;
    let lastContentPath: string | null = null;

    let responseText = "";
    let completedResponse: any = null;

    function getByPath(obj: any, path: string): any {
      const keys = String(path)
        .split("/")
        .filter(Boolean)
        .map((k) => k.replace(/~1/g, "/").replace(/~0/g, "~"));
      let cur = obj;
      for (const k of keys) {
        if (cur == null) return undefined;
        cur = Array.isArray(cur) ? cur[Number(k)] : cur[k];
      }
      return cur;
    }

    function setByPath(obj: any, path: string, value: any): boolean {
      const keys = String(path)
        .split("/")
        .filter(Boolean)
        .map((k) => k.replace(/~1/g, "/").replace(/~0/g, "~"));
      if (keys.length === 0) return false;
      let cur = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (cur == null) return false;
        cur = Array.isArray(cur) ? cur[Number(k)] : cur[k];
      }
      if (cur == null) return false;
      const last = keys[keys.length - 1];
      if (Array.isArray(cur)) {
        if (last === "-") cur.push(value);
        else cur[Number(last)] = value;
      } else {
        cur[last] = value;
      }
      return true;
    }

    // Apply a ChatGPT JSON-Patch style delta to the reconstructed document.
    // Real shapes observed in the /conversation SSE stream:
    //   {p:"", o:"add", v:<object>, c:0}            initial base document
    //   {v:<object>, c:N}                           full document replacement
    //   {v:[<sub-patch>, ...]}                      batch of sub-patches (no o)
    //   {o:"patch", v:[<sub-patch>, ...]}           batch of sub-patches
    //   {p:"/message/content/parts/0", o:"append", v:"text"}   content append
    //   {p:"/message/status", o:"replace", v:"finished"}       field update
    function applyDelta(delta: any): void {
      if (!delta || typeof delta !== "object") return;
      const { p, o, v } = delta;

      // Batch of sub-patches (with or without o:"patch").
      if (Array.isArray(v)) {
        for (const sub of v) applyDelta(sub);
        return;
      }

      // Full document replacement (a new message object replaces the doc).
      if (v !== null && typeof v === "object" && p === undefined && o === undefined) {
        doc = v;
        return;
      }

      if (o === "add" || o === "replace") {
        if (p === undefined || p === "" || p === null) {
          if (v !== null && typeof v === "object") {
            doc = v;
          } else if (typeof v === "string") {
            try {
              doc = JSON.parse(v);
            } catch (err) {
              doc = null;
            }
          }
        } else if (doc) {
          setByPath(doc, p, v);
        }
        return;
      }

      if (o === "append") {
        lastContentPath = p || null;
        if (doc && p) {
          const target = getByPath(doc, p);
          if (typeof target === "string") {
            setByPath(doc, p, target + (typeof v === "string" ? v : ""));
            return;
          } else if (Array.isArray(target)) {
            target.push(v);
            return;
          }
        }
        if (typeof v === "string") fullAssistantMessage += v;
        return;
      }

      // Bare string continuation, e.g. {v:"text"}.
      if (typeof v === "string") {
        if (doc && lastContentPath) {
          const target = getByPath(doc, lastContentPath);
          if (typeof target === "string") {
            setByPath(doc, lastContentPath, target + v);
            return;
          }
        }
        fullAssistantMessage += v;
      }
    }

    // Handle the Responses-API typed SSE events (fallback for newer formats).
    function handleResponseEvent(obj: any): void {
      if (!obj || typeof obj !== "object") return;
      const type = obj.type || "";

      if (type === "response.output_text.delta" && typeof obj.delta === "string") {
        responseText += obj.delta;
      } else if (
        (type === "response.output_text.done" || type === "response.refusal.done") &&
        typeof obj.text === "string"
      ) {
        responseText = obj.text;
      } else if (
        (type === "response.completed" ||
          type === "response.incomplete" ||
          type === "response.failed" ||
          type === "response.cancelled") &&
        obj.response &&
        typeof obj.response === "object"
      ) {
        completedResponse = obj.response;
      }
    }

    function mergeResponseText(resp: any, text: string): any {
      if (!resp || typeof resp !== "object" || !text) return resp;
      if (!Array.isArray(resp.output)) resp.output = [];

      let messageItem: any = null;
      for (const item of resp.output) {
        if (item && item.type === "message") {
          messageItem = item;
          break;
        }
      }
      if (!messageItem) {
        messageItem = { type: "message", role: "assistant", content: [] };
        resp.output.push(messageItem);
      }
      if (!Array.isArray(messageItem.content)) messageItem.content = [];

      for (const part of messageItem.content) {
        if (part && part.type === "output_text" && part.text) return resp;
      }

      messageItem.content = messageItem.content.filter(
        (p: any) => !p || p.type !== "output_text"
      );
      messageItem.content.push({ type: "output_text", text });
      return resp;
    }

    // Extract the assistant's rendered text from a reconstructed message doc.
    function messageTextFromDoc(d: any): string {
      const texts: string[] = [];
      const walk = (obj: any) => {
        if (Array.isArray(obj)) {
          obj.forEach(walk);
          return;
        }
        if (obj && typeof obj === "object") {
          if (obj.content_type === "text" && Array.isArray(obj.parts)) {
            for (const p of obj.parts) {
              if (typeof p === "string") texts.push(p);
            }
          }
          for (const k of Object.keys(obj)) walk(obj[k]);
        }
      };
      walk(d);
      return texts.join("");
    }

    function responseTextFromDoc(d: any): string {
      const texts: string[] = [];
      const walk = (obj: any) => {
        if (Array.isArray(obj)) {
          obj.forEach(walk);
          return;
        }
        if (obj && typeof obj === "object") {
          if (typeof obj.text === "string") texts.push(obj.text);
          for (const k of Object.keys(obj)) walk(obj[k]);
        }
      };
      walk(d);
      return texts.join("");
    }

    function extractAndParseJson(str: string, fallback = null) {
      if (typeof str !== "string") return fallback;

      const cleaned = str.trim();
      let json: string | null = null;

      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        try {
          const unwrapped = JSON.parse(cleaned);
          if (typeof unwrapped === "string") json = unwrapped;
        } catch (err) {
          // Not a wrapped JSON string; fall through.
        }
      }

      if (json === null && cleaned.startsWith("{")) {
        try {
          const unwrapped = JSON.parse('"' + cleaned + '"');
          if (typeof unwrapped === "string") json = unwrapped;
        } catch (err) {
          // Not a fully escaped payload; fall through.
        }
      }

      if (json === null) {
        json = extractBalancedJson(cleaned);
      }

      if (json === null) return fallback;

      try {
        return JSON.parse(json);
      } catch (e) {
        console.warn("Failed to parse JSON:", e);
        return fallback;
      }
    }

    function extractBalancedJson(str: string): string | null {
      let depth = 0;
      let inString = false;
      let escaped = false;
      let lastStart = -1;
      let lastEnd = -1;

      for (let i = 0; i < str.length; i++) {
        const ch = str[i];

        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (ch === "\\") {
            escaped = true;
          } else if (ch === '"') {
            inString = false;
          }
          continue;
        }

        if (ch === '"') {
          inString = true;
        } else if (ch === "{") {
          if (depth === 0) lastStart = i;
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 0) lastEnd = i;
        }
      }

      if (lastStart >= 0 && lastEnd > lastStart) {
        return str.slice(lastStart, lastEnd + 1);
      }
      return null;
    }

    async function readStream() {
      while (true) {
        if (reader === undefined) return response;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newline
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() as string;

        for (let part of parts) {
          part = part.trim();
          if (!part) continue;

          // Split lines within this event
          const lines = part.split(/\r?\n/);

          let eventName: string | null = null;
          let dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.substring("event:".length).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.substring("data:".length).trim());
            }
          }

          const dataStr = dataLines.join("\n");
          if (!dataStr || dataStr === "[DONE]") continue;

          let obj: any = null;
          try {
            obj = JSON.parse(dataStr);
          } catch (err) {
            console.warn("Could not parse SSE data JSON:", dataStr, err);
            fullAssistantMessage += dataStr;
            continue;
          }

          const isTypedResponseEvent =
            (eventName !== null && eventName.startsWith("response.")) ||
            (obj && typeof obj.type === "string" && obj.type.startsWith("response."));

          if (eventName === "delta") {
            // Legacy JSON-Patch stream format (current ChatGPT web format).
            applyDelta(obj);
          } else if (isTypedResponseEvent) {
            // New Responses-API typed event format (fallback).
            handleResponseEvent(obj);
          } else if (obj && typeof obj === "object") {
            // Other/unnamed events: grab any text-like payload just in case.
            const partsArr = obj.message?.content?.parts;
            if (Array.isArray(partsArr)) {
              responseText += partsArr
                .filter((x: any) => typeof x === "string")
                .join("");
            } else if (typeof obj.v === "string") {
              fullAssistantMessage += obj.v;
            }
          }
        }
      }

      let parsed: any = null;

      // 1) Legacy JSON-Patch doc: extract JSON from the final assistant text.
      if (parsed === null && doc && typeof doc === "object") {
        const text = messageTextFromDoc(doc);
        if (text && text.trim()) {
          parsed = extractAndParseJson(text, null);
          if (parsed === null) parsed = { text };
        }
      }

      // 2) New Responses-API format: full envelope from response.completed.
      if (parsed === null && completedResponse && typeof completedResponse === "object") {
        parsed = mergeResponseText(completedResponse, responseText);
      }

      // 3) New format deltas without a terminal event: build envelope from text.
      if (parsed === null && responseText) {
        parsed = {
          object: "response",
          status: "completed",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: responseText }],
            },
          ],
        };
      }

      // 4) Last-resort raw text extraction.
      if (parsed === null) {
        parsed = extractAndParseJson(fullAssistantMessage, null);
      }

      window.postMessage({ data: parsed }, "*");
    }
    readStream().catch((err) => console.error("SSE read error:", err));
    return response;
  };
})();
