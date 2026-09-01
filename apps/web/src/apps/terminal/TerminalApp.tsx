import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalApp({ winId }: { winId: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'monospace',
      theme: { background: '#1e1e1e' }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const wsUrl = `ws://${window.location.hostname}:3001/ws/terminal?termId=${encodeURIComponent(winId)}`;
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

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'terminal.resize', cols: term.cols, rows: term.rows }));
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* macOS Terminal Titlebar */}
      <div className="h-14 flex items-center justify-center shrink-0 nebudesk-drag-region select-none touch-none bg-[#1e1e1e] border-b border-[#333]">
        <span className="text-gray-400 text-xs font-semibold select-none">Terminal</span>
      </div>
      
      <div className="flex-1 p-2">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
}
