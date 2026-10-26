import { createRoot } from 'react-dom/client';
import { Zai } from './components/zai';
import './style.css';

const div = document.createElement('div');
div.id = '__root_zai';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__root_zai');
if (!rootContainer) throw new Error("Can't find z.ai root element");
const root = createRoot(rootContainer);
root.render(<Zai />);
