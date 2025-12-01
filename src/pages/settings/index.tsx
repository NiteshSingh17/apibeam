import { createRoot } from "react-dom/client";
import { SettingPage } from "./components";
import '@assets/styles/tailwind.css';


const div = document.createElement('div');
div.id = '__root';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__root');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(
  <SettingPage />
);

try {
} catch (e) {
  console.error(e);
}
