import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Globe } from 'lucide-react';

export default function BrowserApp({ initialUrl = 'http://localhost:5050' }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [input, setInput] = useState(initialUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = input.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'http://' + target;
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
      <div className="flex-1 relative bg-gray-50">
        <iframe
          ref={iframeRef}
          src={url}
          title="NebuBrowser"
          className="w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
}
