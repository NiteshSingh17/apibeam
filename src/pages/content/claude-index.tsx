import { createRoot } from 'react-dom/client';
import { Claude } from './components/claude';
import './style.css';

console.log('[ApiBeam] Claude content script loaded');

const div = document.createElement('div');
div.id = '__root_claude';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__root_claude');
if (!rootContainer) throw new Error("Can't find Claude root element");
const root = createRoot(rootContainer);
root.render(<Claude />);
