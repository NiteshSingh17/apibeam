import { useEffect, useRef, useState } from 'react';
import { createPrompt } from './createPrompt';

/**
 * Shared hook for handling background messages (ask_question + set_settings).
 * The `onAskQuestion` callback receives the raw message content and a one-time
 * prompt string (only non-empty on the very first call, then empty thereafter).
 */
export const useMessageHandler = (
  onAskQuestion: (content: { route: string; body: object }, prompt: string) => void
) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [method, setMethod] = useState('');
  const isInitialized = useRef(false);
  const promptRef = useRef(createPrompt('', ''));

  useEffect(() => {
    promptRef.current = createPrompt(selectedLanguage, method);
  }, [selectedLanguage, method]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'get_settings' });

    const listener = (msg: any) => {
      console.log("dd33 ", msg)
      if (msg.type === 'ask_question') {
        const prompt = isInitialized.current ? '' : promptRef.current;
        isInitialized.current = true;
        onAskQuestion(msg.content, prompt);
      } else if (msg.type === 'set_settings' && msg.content) {
        setSelectedLanguage(msg.content.language);
        setMethod(msg.content.method);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [onAskQuestion]);

  return { selectedLanguage, method };
};
