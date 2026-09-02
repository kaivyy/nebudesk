import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Globe, Code } from 'lucide-react';

export default function BrowserApp({ initialUrl = 'http://localhost:5050' }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [input, setInput] = useState(initialUrl);
  const [devMode, setDevMode] = useState(false);

  const getProxiedUrl = (target: string) => {
    if (target.includes('localhost') || target.includes('127.0.0.1')) return target;
    const baseUrl = `http://${window.location.hostname}:3030`;
    return `${baseUrl}/api/browser/proxy?url=${encodeURIComponent(target)}`;
  };

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = input.trim();
    
    const isUrl = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(target) || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('localhost') || target.startsWith('127.0.0.1');

    if (!isUrl) {
      target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    
    setUrl(target);
    setInput(target);
  };

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Safari-like Titlebar / Toolbar */}
      <div className="h-14 bg-gray-100 border-b border-gray-300 flex items-center shrink-0 nebudesk-drag-region select-none touch-none px-2">
        <div className="w-[80px] shrink-0"></div> {/* Space for traffic lights */}
        
        <div className="flex items-center space-x-1 nebudesk-no-drag">
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Back" onClick={() => iframeRef.current?.contentWindow?.history.back()}>
            <ArrowLeft size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Forward" onClick={() => iframeRef.current?.contentWindow?.history.forward()}>
            <ArrowRight size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Reload" onClick={handleReload}>
            <RotateCw size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200 ml-1" title="Localhost" onClick={() => { setUrl('http://localhost:5050'); setInput('http://localhost:5050'); }}>
            <Home size={16} />
          </button>
          <button className={`p-1.5 rounded ml-1 ${devMode ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:bg-gray-200'}`} title="DevTools" onClick={() => setDevMode(!devMode)}>
            <Code size={16} />
          </button>
        </div>

        <form onSubmit={handleNavigate} className="flex-1 max-w-2xl mx-4 nebudesk-no-drag relative">
          <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
            placeholder="Search or enter website name..."
          />
        </form>
      </div>

      {/* Browser Content */}
      <div className="flex-1 flex flex-col relative bg-gray-50">
        <div className={`w-full ${devMode ? 'h-1/2 border-b border-gray-300' : 'h-full'}`}>
          <iframe
            ref={iframeRef}
            src={getProxiedUrl(url)}
            title="NebuBrowser"
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>
        {devMode && (
          <div className="flex-1 bg-[#242424] text-[#d4d4d4] flex flex-col overflow-hidden text-sm font-mono">
            <div className="h-8 border-b border-[#3c3c3c] bg-[#2d2d2d] flex items-center px-4 space-x-4">
              <button className="text-white border-b-2 border-blue-500 h-full px-1">Elements</button>
              <button className="text-gray-400 hover:text-white h-full px-1">Console</button>
              <button className="text-gray-400 hover:text-white h-full px-1">Network</button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div>Waiting for WebSocket connection to Chromium CDP...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
