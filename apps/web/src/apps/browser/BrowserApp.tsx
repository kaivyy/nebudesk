import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Globe, Code, Loader } from 'lucide-react';

export default function BrowserApp({ initialUrl = 'http://localhost:5050' }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [input, setInput] = useState(initialUrl);
  const [devMode, setDevMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Console');
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const [domContent, setDomContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [screenFrame, setScreenFrame] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getProxiedUrl = (target: string) => {
    if (target.includes('localhost') || target.includes('127.0.0.1')) return target;
    const baseUrl = `http://${window.location.hostname}:3030`;
    return `${baseUrl}/api/browser/proxy?url=${encodeURIComponent(target)}`;
  };

  // WebSocket connection for DevTools mode
  useEffect(() => {
    if (!devMode) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setScreenFrame('');
      setConsoleLogs([]);
      setNetworkRequests([]);
      setDomContent('');
      return;
    }

    setLoading(true);
    const wsUrl = `ws://${window.location.hostname}:3030/ws/browser`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'init', url }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'screencast':
            setScreenFrame(`data:image/jpeg;base64,${msg.data}`);
            setLoading(false);
            break;
          case 'console':
            setConsoleLogs(prev => [...prev.slice(-200), msg.data]);
            break;
          case 'network-request':
            setNetworkRequests(prev => [...prev.slice(-200), { ...msg.data, type: 'request' }]);
            break;
          case 'network-response':
            setNetworkRequests(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(r => r.requestId === msg.data.requestId);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], status: msg.data.status, mimeType: msg.data.mimeType };
              }
              return updated;
            });
            break;
          case 'dom':
            setDomContent(JSON.stringify(msg.data, null, 2));
            break;
          case 'navigated':
            setInput(msg.url);
            setConsoleLogs([]);
            setNetworkRequests([]);
            setDomContent('');
            break;
          case 'error':
            setLoading(false);
            break;
        }
      } catch (e) {}
    };

    ws.onerror = () => setLoading(false);
    ws.onclose = () => setLoading(false);

    return () => { ws.close(); wsRef.current = null; };
  }, [devMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

    if (devMode && wsRef.current?.readyState === WebSocket.OPEN) {
      setLoading(true);
      setConsoleLogs([]);
      setNetworkRequests([]);
      wsRef.current.send(JSON.stringify({ action: 'navigate', url: target }));
    }
  };

  const handleReload = () => {
    if (devMode && wsRef.current?.readyState === WebSocket.OPEN) {
      setLoading(true);
      wsRef.current.send(JSON.stringify({ action: 'navigate', url }));
    } else if (iframeRef.current) {
      iframeRef.current.src = getProxiedUrl(url);
    }
  };

  // Forward mouse/keyboard events to Playwright when in DevTools mode
  const sendInput = useCallback((event: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'input', event }));
    }
  }, []);

  const handleScreenClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    sendInput({ type: 'mousedown', x, y });
    setTimeout(() => sendInput({ type: 'mouseup', x, y }), 50);
  };

  const handleScreenScroll = (e: React.WheelEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    sendInput({ type: 'scroll', x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, deltaX: e.deltaX, deltaY: e.deltaY });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!devMode) return;
    e.preventDefault();
    sendInput({ type: 'keydown', key: e.key, text: e.key.length === 1 ? e.key : '', code: e.code });
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (!devMode) return;
    sendInput({ type: 'keyup', key: e.key, code: e.code });
  };

  const statusColor = (status: number) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="h-full flex flex-col bg-white" tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
      {/* Toolbar */}
      <div className="h-14 bg-gray-100 border-b border-gray-300 flex items-center shrink-0 nebudesk-drag-region select-none touch-none px-2">
        <div className="w-[80px] shrink-0"></div>
        
        <div className="flex items-center space-x-1 nebudesk-no-drag">
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Back" onClick={() => { if (!devMode) iframeRef.current?.contentWindow?.history.back(); }}>
            <ArrowLeft size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Forward" onClick={() => { if (!devMode) iframeRef.current?.contentWindow?.history.forward(); }}>
            <ArrowRight size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Reload" onClick={handleReload}>
            <RotateCw size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200 ml-1" title="Localhost" onClick={() => { setUrl('http://localhost:5050'); setInput('http://localhost:5050'); }}>
            <Home size={16} />
          </button>
          <button className={`p-1.5 rounded ml-1 ${devMode ? 'text-blue-500 bg-blue-100' : 'text-gray-500 hover:bg-gray-200'}`} title="DevTools" onClick={() => setDevMode(!devMode)}>
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

      {/* Content Area */}
      <div className="flex-1 flex flex-col relative bg-gray-50 overflow-hidden">
        {/* Browser View */}
        <div className={`w-full ${devMode ? 'h-1/2 border-b border-gray-300' : 'h-full'} relative`}>
          {devMode ? (
            // Screencast mode — real Chromium rendered frames
            <div ref={canvasRef} className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
              {loading && !screenFrame && (
                <div className="flex flex-col items-center text-gray-400">
                  <Loader size={24} className="animate-spin mb-2" />
                  <span className="text-sm">Connecting to Chromium...</span>
                </div>
              )}
              {screenFrame && (
                <img
                  src={screenFrame}
                  alt="Browser"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={handleScreenClick}
                  onWheel={handleScreenScroll}
                  draggable={false}
                />
              )}
            </div>
          ) : (
            // Lightweight iframe mode
            <iframe
              ref={iframeRef}
              src={getProxiedUrl(url)}
              title="NebuBrowser"
              className="w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          )}
        </div>

        {/* DevTools Panel */}
        {devMode && (
          <div className="flex-1 bg-[#242424] text-[#d4d4d4] flex flex-col overflow-hidden text-[12px] font-mono">
            <div className="h-8 border-b border-[#3c3c3c] bg-[#2d2d2d] flex items-center px-4 space-x-4 shrink-0">
              {['Elements', 'Console', 'Network'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-full px-1 ${activeTab === tab ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => { setConsoleLogs([]); setNetworkRequests([]); }} className="text-gray-500 hover:text-white text-[11px]">Clear</button>
            </div>
            <div className="flex-1 overflow-auto bg-[#1e1e1e]">
              {activeTab === 'Elements' && (
                <pre className="p-3 text-gray-300 whitespace-pre-wrap text-[11px] leading-4">
                  {domContent || 'Navigate to a page to inspect its DOM...'}
                </pre>
              )}
              {activeTab === 'Console' && (
                <div className="flex flex-col">
                  {consoleLogs.map((log, i) => (
                    <div key={i} className="border-b border-[#2a2a2a] px-3 py-1 hover:bg-[#2a2d2a]">
                      <span className={`mr-2 ${
                        log.message?.level === 'error' ? 'text-red-400' : 
                        log.message?.level === 'warning' ? 'text-yellow-400' : 'text-gray-500'
                      }`}>[{log.message?.level}]</span>
                      <span className={log.message?.level === 'error' ? 'text-red-300' : 'text-gray-300'}>{log.message?.text}</span>
                    </div>
                  ))}
                  {consoleLogs.length === 0 && <div className="p-3 text-gray-600">Console is empty. Logs will appear here.</div>}
                </div>
              )}
              {activeTab === 'Network' && (
                <div className="flex flex-col">
                  <div className="grid grid-cols-[60px_60px_1fr_80px] gap-2 px-3 py-1 border-b border-[#3c3c3c] text-gray-500 bg-[#252525] sticky top-0">
                    <span>Method</span>
                    <span>Status</span>
                    <span>URL</span>
                    <span>Type</span>
                  </div>
                  {networkRequests.map((req, i) => (
                    <div key={i} className="grid grid-cols-[60px_60px_1fr_80px] gap-2 px-3 py-0.5 border-b border-[#2a2a2a] hover:bg-[#2a2d2a] truncate">
                      <span className="text-blue-400">{req.method}</span>
                      <span className={statusColor(req.status)}>{req.status || '...'}</span>
                      <span className="text-gray-300 truncate">{req.url}</span>
                      <span className="text-gray-500 truncate">{req.mimeType || ''}</span>
                    </div>
                  ))}
                  {networkRequests.length === 0 && <div className="p-3 text-gray-600">No network activity.</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
