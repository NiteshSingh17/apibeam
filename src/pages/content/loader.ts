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

          let eventName = null;
          let dataLines = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.substring("event:".length).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.substring("data:".length).trim());
            }
          }

          const dataStr = dataLines.join("\n");

          // Handle different event types
          if (eventName === "delta" || eventName === "delta_encoding") {
            // Try parse JSON
            try {
              const obj = JSON.parse(dataStr);

              if (eventName === "delta") {
                // In your sample, deltas have "v": array of patches
                if (Array.isArray(obj.v)) {
                  for (const patch of obj.v) {
                    // Look for patches that append to the message content
                    if (patch.p && patch.o === "append" && patch.v) {
                      // e.g., v: {"p": "/message/content/parts/0", "o":"append", "v":" text"}
                      // Check if path matches content parts
                      if (patch.p.includes("/message/content/parts")) {
                        fullAssistantMessage += patch.v;
                      }
                    }
                  }
                }
              } else if (eventName === "delta_encoding") {
                // encoding event, you may ignore or store token if needed
                // dataStr is probably a string like "v1", so just ignore
              }
            } catch (err) {
              console.warn("Could not parse SSE data JSON:", dataStr, err);
              // fallback: append raw data
              fullAssistantMessage += dataStr;
            }
          } else if (eventName === null) {
            // No explicit event: maybe just data lines with JSON
            try {
              const obj = JSON.parse(dataStr);

              // Try to detect final message / complete content
              // Based on your sample: server_ste_metadata, message_marker, message_stream_complete
              if (obj.type === "message_stream_complete") {
                // when this arrives, stream is done
              }
            } catch (err) {
              // Not JSON — skip or log
            }
          }
        }
      }

      function extractAndParseJson(str: string, fallback = null) {
        if (typeof str !== "string") return fallback;

        // Use a regex to match a JSON block
        const jsonMatch = str.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return fallback;

        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn("Failed to parse JSON:", e);
          return fallback;
        }
      }
      window.postMessage(
        { data: extractAndParseJson(fullAssistantMessage) },
        "*"
      );
    }
    readStream().catch((err) => console.error("SSE read error:", err));
    return response;
  };
})();
