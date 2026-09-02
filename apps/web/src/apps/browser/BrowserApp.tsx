import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Globe, Code, Loader, Keyboard } from 'lucide-react';

import DOMInspector from './DOMInspector';

export default function BrowserApp({ initialUrl = 'http://localhost:5050' }: { initialUrl?: string }) {
  const [input, setInput] = useState(() => {
    try { return localStorage.getItem('nebu_browser_last_url') || initialUrl; }
    catch(e) { return initialUrl; }
  });
  const [devMode, setDevMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Console');
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const [domContent, setDomContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenFrame, setScreenFrame] = useState<string>('');
  
  const [mobileText, setMobileText] = useState(" ");
  const [autoKeyboard, setAutoKeyboard] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportSize = useRef({ width: 1280, height: 720 });
  const resizeTimer = useRef<any>(null);
  const touchState = useRef({ startX: 0, startY: 0, x: 0, y: 0, scrolling: false });

  useEffect(() => {
    setLoading(true);
    const wsUrl = `ws://${window.location.hostname}:3030/ws/browser`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvasRef.current) {
        viewportSize.current = {
          width: Math.floor(canvasRef.current.clientWidth) || 1280,
          height: Math.floor(canvasRef.current.clientHeight) || 720
        };
      }
      ws.send(JSON.stringify({ 
        action: 'init', 
        url: input,
        width: viewportSize.current.width,
        height: viewportSize.current.height,
        dpr
      }));
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
            setDomContent(msg.data?.root || null);
            break;
          case 'navigated':
            setInput(msg.url);
            try { localStorage.setItem('nebu_browser_last_url', msg.url); } catch(e) {}
            setLoading(false);
            setError(null);
            setConsoleLogs([]);
            setNetworkRequests([]);
            setDomContent(null);
            break;
          case 'error':
            setLoading(false);
            setError(msg.message);
            break;
        }
      } catch (e) {}
    };

    ws.onerror = () => setLoading(false);
    
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      
      const newW = Math.floor(width);
      const newH = Math.floor(height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      if (newW !== viewportSize.current.width || newH !== viewportSize.current.height) {
        viewportSize.current = { width: newW, height: newH };
        
        clearTimeout(resizeTimer.current);
        resizeTimer.current = setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'resize', width: newW, height: newH, dpr }));
          }
        }, 300);
      }
    });
    
    resizeObserver.observe(canvasRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (devMode && activeTab === 'Elements' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'getDOM' }));
    }
  }, [devMode, activeTab]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = input.trim();
    if (!target) return;

    const isUrl = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(target) || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('localhost') || target.startsWith('127.0.0.1');

    if (!isUrl) {
      target = `https://www.bing.com/search?q=${encodeURIComponent(target)}`;
    } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    setInput(target);
    setLoading(true);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'navigate', url: target }));
    }
  };

  const sendInput = useCallback((event: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'input', event }));
    }
  }, []);

  // Convert screen pixel coordinates to Chromium viewport coordinates.
  // The <img> uses object-contain so the rendered image may be letterboxed.
  // We use viewportSize (not naturalWidth/Height which includes DPR scaling).
  const toViewportCoords = (clientX: number, clientY: number, el: HTMLImageElement) => {
    const rect = el.getBoundingClientRect();
    const vpW = viewportSize.current.width;
    const vpH = viewportSize.current.height;

    // Calculate how the image is rendered inside the container
    const containerAspect = rect.width / rect.height;
    const imageAspect = vpW / vpH;

    let renderedW: number, renderedH: number;
    if (imageAspect > containerAspect) {
      // Image is wider than container — pillarboxed (black bars top/bottom)
      renderedW = rect.width;
      renderedH = rect.width / imageAspect;
    } else {
      // Image is taller than container — letterboxed (black bars left/right)
      renderedH = rect.height;
      renderedW = rect.height * imageAspect;
    }

    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;

    const x = ((clientX - rect.left - offsetX) / renderedW) * vpW;
    const y = ((clientY - rect.top - offsetY) / renderedH) * vpH;

    return {
      x: Math.max(0, Math.min(vpW, Math.round(x))),
      y: Math.max(0, Math.min(vpH, Math.round(y)))
    };
  };

  const focusKeyboard = () => {
    if (autoKeyboard && hiddenInputRef.current) {
      hiddenInputRef.current.focus({ preventScroll: true });
    }
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const { x, y } = toViewportCoords(e.clientX, e.clientY, e.currentTarget);
    focusKeyboard();
    sendInput({ type: 'mousemove', x, y });
    sendInput({ type: 'mousedown', x, y });
    setTimeout(() => sendInput({ type: 'mouseup', x, y }), 50);
  };

  const handleScreenScroll = (e: React.WheelEvent<HTMLImageElement>) => {
    const { x, y } = toViewportCoords(e.clientX, e.clientY, e.currentTarget);
    sendInput({ type: 'scroll', x, y, deltaX: e.deltaX, deltaY: e.deltaY });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    const touch = e.touches[0];
    touchState.current = { startX: touch.clientX, startY: touch.clientY, x: touch.clientX, y: touch.clientY, scrolling: false };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    const touch = e.touches[0];
    const totalDx = Math.abs(touch.clientX - touchState.current.startX);
    const totalDy = Math.abs(touch.clientY - touchState.current.startY);
    
    if (totalDx > 15 || totalDy > 15) {
      touchState.current.scrolling = true;
    }
    
    if (touchState.current.scrolling) {
      const dx = touchState.current.x - touch.clientX;
      const dy = touchState.current.y - touch.clientY;
      sendInput({ type: 'scroll', deltaX: dx, deltaY: dy });
      touchState.current.x = touch.clientX;
      touchState.current.y = touch.clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLImageElement>) => {
    if (!touchState.current.scrolling) {
      focusKeyboard();
      const { x, y } = toViewportCoords(touchState.current.startX, touchState.current.startY, e.currentTarget);
      sendInput({ type: 'mousemove', x, y });
      sendInput({ type: 'mousedown', x, y });
      setTimeout(() => sendInput({ type: 'mouseup', x, y }), 50);
    }
  };

  const handleMobileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > mobileText.length) {
      const char = val.slice(-1);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'insertText', text: char }));
      }
    } else if (val.length < mobileText.length) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'input', event: { type: 'keydown', key: 'Backspace' } }));
        wsRef.current.send(JSON.stringify({ action: 'input', event: { type: 'keyup', key: 'Backspace' } }));
      }
    }
    setMobileText(" ");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.id !== 'mobile-keyboard-trap') return;
    
    if (target.id === 'mobile-keyboard-trap') {
      if (e.key === 'Unidentified') return;
      if (e.key === 'Backspace' || e.key.length === 1) return;
    } else {
      e.preventDefault();
    }
    sendInput({ type: 'keydown', key: e.key, text: e.key.length === 1 ? e.key : '', code: e.code });
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.id !== 'mobile-keyboard-trap') return;
    if (target.id === 'mobile-keyboard-trap' && (e.key === 'Backspace' || e.key.length === 1)) return;
    
    sendInput({ type: 'keyup', key: e.key, code: e.code });
  };

  const statusColor = (status: number) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleBack = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'back' }));
    }
  };

  const handleForward = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'forward' }));
    }
  };

  const handleReload = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setLoading(true);
      wsRef.current.send(JSON.stringify({ action: 'reload' }));
    }
  };

  return (
    <div className="h-full flex flex-col bg-white" tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
      <div className="h-14 bg-gray-100 border-b border-gray-300 flex items-center shrink-0 nebudesk-drag-region select-none touch-none px-2">
        <div className="w-[80px] shrink-0"></div>
        
        <div className="flex items-center space-x-1 nebudesk-no-drag">
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Back" onClick={handleBack}>
            <ArrowLeft size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Forward" onClick={handleForward}>
            <ArrowRight size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200" title="Reload" onClick={handleReload}>
            <RotateCw size={16} />
          </button>
          <button className="p-1.5 rounded text-gray-500 hover:bg-gray-200 ml-1" title="Localhost" onClick={() => setInput('http://localhost:5050')}>
            <Home size={16} />
          </button>
          <button 
            className={`p-1.5 rounded ml-1 md:hidden ${autoKeyboard ? 'text-blue-500 bg-blue-100' : 'text-gray-500 hover:bg-gray-200'}`} 
            title={autoKeyboard ? "Auto Keyboard: ON" : "Auto Keyboard: OFF"}
            onClick={() => {
              const next = !autoKeyboard;
              setAutoKeyboard(next);
              if (next) hiddenInputRef.current?.focus();
            }}
          >
            <Keyboard size={16} />
          </button>
          <button className={`p-1.5 rounded ml-1 ${devMode ? 'text-blue-500 bg-blue-100' : 'text-gray-500 hover:bg-gray-200'}`} title="Toggle DevTools Panel" onClick={() => setDevMode(!devMode)}>
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

      <div className="flex-1 flex flex-col relative bg-gray-50 overflow-hidden">
        <div className={`w-full ${devMode ? 'h-1/2 border-b border-gray-300' : 'h-full'} relative`}>
          <input
            ref={hiddenInputRef}
            id="mobile-keyboard-trap"
            type="text"
            value={mobileText}
            onChange={handleMobileInputChange}
            style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <div ref={canvasRef} className="w-full h-full bg-black flex items-center justify-center overflow-hidden relative">
            {loading && !screenFrame && !error && (
              <div className="flex flex-col items-center text-gray-400">
                <Loader size={24} className="animate-spin mb-2" />
                <span className="text-sm">Connecting to Chromium...</span>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-6">
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-white max-w-md text-center">
                  <div className="font-bold mb-2 text-red-300">Browser Error</div>
                  <div className="text-sm leading-relaxed">{error}</div>
                </div>
              </div>
            )}
            {screenFrame && !error && (
              <img
                ref={imgRef}
                src={screenFrame}
                alt="Browser"
                className="w-full h-full object-contain cursor-pointer"
                style={{ touchAction: 'none' }}
                onWheel={handleScreenScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => {
                  if ((e.nativeEvent as any).pointerType !== 'touch') {
                    handleScreenClick(e);
                  }
                }}
                draggable={false}
              />
            )}
          </div>
        </div>

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
                <DOMInspector node={domContent} />
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
