<div align="center">
  <img src="public/icon-128.png" alt="ApiBeam Logo" width="128" height="128" />
  <h1>ApiBeam</h1>
  <p><strong>Convert your ChatGPT account into an API</strong></p>
  <p>A Chrome/Firefox extension that bridges your ChatGPT account to your applications through a simple REST API</p>
</div>

---

## 🚀 Overview

ApiBeam is a powerful browser extension that transforms your ChatGPT account into a programmatic API. Instead of manually interacting with ChatGPT through the web interface, ApiBeam allows you to:

- Send API requests from your applications to your ChatGPT account
- Receive structured responses in JSON format
- Configure language-specific prompts for consistent API-like responses
- Maintain full control of your data (everything runs locally on your machine)

**Perfect for**: Developers who want to use ChatGPT as a backend service without OpenAI API costs or API keys.

---

## ✨ Features

- 🔌 **Simple REST API** - Access ChatGPT via HTTP requests
- 🌍 **Cross-Browser Support** - Works on Chrome and Firefox (Manifest V3)
- ⚡ **Real-time WebSocket Connection** - Low-latency server-to-extension communication
- 🔒 **Local & Private** - All data stays on your machine, no third-party servers
- 🎯 **Language-Specific Prompts** - Configure responses for Node.js, Python, Go, Ruby, PHP
- 💾 **Persistent Configuration** - Save your settings locally
- 📊 **Network Monitoring** - Check connection speed and status in real-time
- 🔄 **Auto-Reconnect** - Automatic WebSocket reconnection with exponential backoff

---

## 📋 Requirements

- Node.js >= 18.17.1
- npm or yarn
- Chrome or Firefox browser
- Active ChatGPT account

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/NiteshSingh17/apibeam.git
cd apibeam
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Development Build

Build for Chrome (default):
```bash
npm run dev
# or
npm run dev:chrome
```

Build for Firefox:
```bash
npm run dev:firefox
```

This will watch for changes and rebuild automatically.

### 4. Load Extension in Browser

#### Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist_chrome` folder

#### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file from the `dist_firefox` folder (e.g., `manifest.json`)

---

## 🔧 Production Build

### Build for Chrome
```bash
npm run build:chrome
```

### Build for Firefox
```bash
npm run build:firefox
```

Output will be in `dist_chrome/` or `dist_firefox/`

---

## 📚 How It Works

### Architecture Flow

```
Your App (Client) 
    ↓
  HTTP Request
    ↓
ApiBeam Server (Middleware)
    ↓
  WebSocket Message
    ↓
Chrome Extension (Running on Your Computer)
    ↓
ChatGPT Web Interface
    ↓
Response travels back through the same chain
```

### Step-by-Step Process

1. **Your Application** sends an HTTP request to the ApiBeam server with a prompt
2. **ApiBeam Server** receives the request and broadcasts it via WebSocket
3. **Chrome Extension** receives the message and injects it into ChatGPT
4. **ChatGPT** processes the request and returns a response
5. **Extension** captures the response stream and sends it back through WebSocket
6. **Server** returns the structured response to your application

---

## 🔗 API Usage

### Get Your API URL

1. Click the ApiBeam extension icon
2. Click **Settings**
3. Your unique API URL will be displayed (e.g., `https://apibeam.bitsmall.in/app/abc123def456`)

### Configuration

Before making requests, configure your language and method:

1. Select your programming language (Node.js, Python, Go, Ruby, PHP)
2. Enter the library method/function name (e.g., `client.chat.completions.create`)
3. Click **Save Configuration**

### Example Requests

#### Python with OpenAI Library

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://apibeam.bitsmall.in/app/YOUR_ROOM_ID",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "What is Python?"}
    ]
)

print(response.choices[0].message.content)
```

#### JavaScript with OpenAI SDK

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://apibeam.bitsmall.in/app/YOUR_ROOM_ID",
  apiKey: "not-needed"
});

const message = await client.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "user", content: "What is JavaScript?" }
  ]
});

console.log(message.choices[0].message.content);
```

---

## ⚙️ Configuration

### Settings Panel

The extension provides a comprehensive settings panel where you can:

- **Select Programming Language**: Choose from Node.js, Python, Go, Ruby, PHP
- **Set Method Name**: Specify the API method being used
- **View Connection Status**: Monitor if your extension is connected to the server
- **Check Network Speed**: Real-time network performance metrics
- **Copy API URL**: Easily copy your unique API endpoint

### Storage

Settings are stored locally using Chrome's storage API:
- **Language preference**
- **Method configuration**
- **Room ID** (unique identifier for your connection)

---

## 🔒 Security & Privacy

✅ **All your data stays on your machine**
- No ChatGPT messages are sent to external servers (except through your WebSocket connection)
- The extension runs entirely locally
- Your API Key is never exposed
- Communications between extension and server are encrypted

⚠️ **What you should know**
- Your ChatGPT session is visible in the extension
- Keep your API URL private (treat it like an API key)
- Run the extension on a trusted computer

---

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Extension shows "Disconnected"
- **Solution**: Check if the ApiBeam server is running
- Refresh the settings page
- Restart the browser extension

### ChatGPT Detection Failed

**Problem**: Extension can't find ChatGPT input field
- **Solution**: Make sure you're on `https://chatgpt.com`
- Ensure ChatGPT is fully loaded
- Check browser console for errors

### Response Parsing Errors

**Problem**: Responses are incomplete or malformed
- **Solution**: Verify your language and method configuration
- Check that your prompt is valid
- Review ChatGPT's response format

### Network Speed Shows "Calculating..."

**Problem**: Network speed information isn't available
- **Solution**: This depends on browser support for the Network Information API
- Works best on Chrome/Edge, limited support on Firefox

---

## 📁 Project Structure

```
apibeam/
├── src/
│   ├── pages/
│   │   ├── background/       # Background service worker
│   │   ├── content/          # Content script (runs on ChatGPT)
│   │   ├── popup/            # Extension popup UI
│   │   └── settings/         # Settings page
│   ├── locales/              # i18n translations
│   ├── assets/               # Static assets
│   └── global.d.ts           # Global type definitions
├── public/                   # Public assets
├── manifest.json             # Extension manifest
├── vite.config.base.ts       # Base Vite configuration
├── vite.config.chrome.ts     # Chrome-specific config
├── vite.config.firefox.ts    # Firefox-specific config
└── package.json
```

---

## 🛠️ Development Guide

### Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Vite** - Build tool
- **@crxjs/vite-plugin** - Chrome extension bundling
- **Socket.IO** - WebSocket communication

### Adding New Pages

1. Create a new folder in `src/pages/`
2. Add `index.html`, `index.tsx`, and `index.css`
3. Update `vite.config.base.ts` to include it in `rollupOptions.input`
4. Add corresponding manifest entries

### Building Custom Plugins

See [`custom-vite-plugins.ts`](custom-vite-plugins.ts) for examples:
- `stripDevIcons` - Remove dev icons from production builds
- `crxI18n` - Handle internationalization

---

## 📦 Publishing

### Chrome Web Store

1. Build the extension: `npm run build:chrome`
2. Create a zip file from `dist_chrome/`
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Firefox Add-ons

1. Build the extension: `npm run build:firefox`
2. Create a zip file from `dist_firefox/`
3. Submit to [Firefox Add-ons](https://addons.mozilla.org/)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚡ Quick Links

- 🐙 [GitHub Repository](https://github.com/NiteshSingh17/apibeam)
- 📖 [OpenAI SDK Documentation](https://github.com/openai/openai-python)
- 📚 [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- 🔌 [Socket.IO Documentation](https://socket.io/docs/)

---

## 🎯 Roadmap

- [ ] Support for other AI models (Claude, Gemini, etc.)
- [ ] Request/response logging and analytics
- [ ] Rate limiting and quota management
- [ ] Team collaboration features
- [ ] Mobile app support
- [ ] Custom prompt templates

---

## 📞 Support

For issues, questions, or suggestions:
1. Check existing [GitHub Issues](https://github.com/NiteshSingh17/apibeam/issues)
2. Create a new issue with detailed information
3. Include browser, OS, and error messages

---

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Real-time communication with [Socket.IO](https://socket.io/)

---
