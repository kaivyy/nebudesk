import { useState, useEffect, useRef } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { useWindowStore } from '../../stores/windowStore';
import { Plus, X } from 'lucide-react';

function TerminalInstance({ termId, active, cwd }: { termId: string, active: boolean, cwd: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    const domEl = terminalRef.current;

    const term = new XTerminal({
      cursorBlink: true,
      fontFamily: 'monospace',
      scrollback: 5000,
      theme: { background: '#1e1e1e' }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(domEl);
    
    // Fit needs to happen after render and layout
    setTimeout(() => fitAddon.fit(), 50);

    const wsUrl = `ws://${window.location.hostname}:3030/ws/terminal?termId=${encodeURIComponent(termId)}&cwd=${encodeURIComponent(cwd)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'terminal.resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal.output') {
          term.write(msg.data);
        }
      } catch (e) {}
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'terminal.input', data }));
      }
    });

    // Handle Ctrl+V / Cmd+V paste & smart Ctrl+C / Cmd+C copy
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // 1. Paste: Ctrl+V, Cmd+V, or Shift+Insert
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) ||
        (e.shiftKey && e.key === 'Insert')
      ) {
        if (e.type === 'keydown') {
          navigator.clipboard.readText().then((text) => {
            if (text && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'terminal.input', data: text }));
            }
          }).catch(() => {});
        }
        return false;
      }

      // 2. Copy: Ctrl+C or Cmd+C when text is actively selected
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' || e.key === 'C') &&
        term.hasSelection()
      ) {
        if (e.type === 'keydown') {
          navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        }
        return false;
      }

      return true;
    });

    // DOM paste listener fallback
    const handleDomPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text');
      if (text && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'terminal.input', data: text }));
      }
    };
    domEl.addEventListener('paste', handleDomPaste);

    // Prevent wheel conversion to Up/Down arrow keys when there is no scrollback and mouse reporting is inactive
    const handleWheel = (e: WheelEvent) => {
      const isMouseActive = Boolean((term as any)._core?.coreMouseService?.areMouseEventsActive);
      if (!isMouseActive && term.buffer.active.baseY === 0) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    domEl.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'terminal.resize', cols: term.cols, rows: term.rows }));
        }
      } catch(e) {}
    });
    resizeObserver.observe(domEl);

    return () => {
      domEl.removeEventListener('paste', handleDomPaste);
      domEl.removeEventListener('wheel', handleWheel, { capture: true });
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div 
      className={`w-full h-full p-2 ${active ? 'block' : 'hidden'}`}
      ref={terminalRef} 
    />
  );
}

export default function TerminalApp({ winId }: { winId: string }) {
  const win = useWindowStore.getState().windows.find(w => w.id === winId) as any;
  const cwd = win?.payload?.cwd || '';
  
  const [tabs, setTabs] = useState<{id: string, name: string}[]>([
    { id: `${winId}-1`, name: 'bash' }
  ]);
  const [activeTab, setActiveTab] = useState(`${winId}-1`);
  const [tabCounter, setTabCounter] = useState(2);

  const addTab = () => {
    const newId = `${winId}-${tabCounter}`;
    setTabs([...tabs, { id: newId, name: 'bash' }]);
    setActiveTab(newId);
    setTabCounter(tabCounter + 1);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden text-sm">
      {/* macOS Terminal Titlebar with Tabs */}
      <div className="h-14 flex items-end shrink-0 nebudesk-drag-region select-none touch-none bg-[#1e1e1e] border-b border-[#333] pl-[90px] pr-2 pt-2">
        <div className="flex space-x-1 overflow-x-auto nebudesk-no-drag scrollbar-hide h-full items-end pb-1">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center group px-3 py-1.5 rounded-t-lg border border-b-0 min-w-[120px] max-w-[200px] cursor-pointer transition-colors ${
                activeTab === tab.id 
                  ? 'bg-[#252526] border-[#333] text-gray-200' 
                  : 'bg-[#1e1e1e] border-transparent text-gray-500 hover:bg-[#252526]/50'
              }`}
            >
              <span className="flex-1 truncate text-xs font-semibold">{tab.name}</span>
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => closeTab(tab.id, e)}
                  className={`p-0.5 rounded-md hover:bg-gray-600/50 ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={addTab}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-[#333] ml-1 mb-1 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative">
        {tabs.map(tab => (
          <TerminalInstance 
            key={tab.id} 
            termId={tab.id} 
             
            active={activeTab === tab.id}
            cwd={cwd}
          />
        ))}
      </div>
    </div>
  );
}