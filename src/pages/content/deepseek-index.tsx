import { createRoot } from 'react-dom/client';
import { DeepSeek } from './components/deepseek';
import './style.css';

console.log('[ApiBeam] DeepSeek content script loaded');

const div = document.createElement('div');
div.id = '__root_deepseek';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__root_deepseek');
if (!rootContainer) throw new Error("Can't find DeepSeek root element");
const root = createRoot(rootContainer);
root.render(<DeepSeek />);
