import { useEffect, useRef, useState } from 'react';
import { createPrompt } from './createPrompt';

/**
 * Shared hook for handling background messages (ask_question + set_settings).
 * The prompt is sent on every message so the AI always knows the expected format.
 */
export const useMessageHandler = (
  onAskQuestion: (content: { route: string; body: object }, prompt: string, useTemporaryChat?: boolean) => void
) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [method, setMethod] = useState('');
  const promptRef = useRef(createPrompt('', ''));

  useEffect(() => {
    promptRef.current = createPrompt(selectedLanguage, method);
  }, [selectedLanguage, method]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'get_settings' });

    const listener = (msg: any) => {
      if (msg.type === 'ask_question') {
        onAskQuestion(msg.content, promptRef.current, msg.useTemporaryChat);
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
