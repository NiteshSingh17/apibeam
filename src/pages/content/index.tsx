import { createRoot } from 'react-dom/client';
import './style.css' 
import { ChatGPT } from './components/chatgpt';
  console.log("contenenene loaded");

const div = document.createElement('div');
div.id = '__root';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__root');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(
  <ChatGPT />
);

try {
} catch (e) {
  console.error(e);
}
