const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// 1. Add xterm imports
const importTarget = "import Editor from '@monaco-editor/react';";
const newImports = `import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';`;
code = code.replace(importTarget, newImports);

// 2. Add IntegratedTerminal component
const componentTarget = "export default function CodeApp";
const integratedTerminalStr = `
function IntegratedTerminal({ workspace, winId }: { workspace: string, winId: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'monospace',
      fontSize: 13,
      theme: { background: '#1e1e1e' }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Fit on next tick to ensure DOM is ready
    setTimeout(() => fitAddon.fit(), 50);

    const wsUrl = \`ws://\${window.location.hostname}:3030/ws/terminal?termId=\${encodeURIComponent(winId + '_integrated')}&cwd=\${encodeURIComponent(workspace)}\`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'terminal.resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal.output') term.write(msg.data);
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
  }, [workspace, winId]);

  return <div ref={terminalRef} className="w-full h-full" />;
}

`;
code = code.replace(componentTarget, integratedTerminalStr + componentTarget);

// 3. Add states to CodeApp
const stateTarget = "const [sidebarWidth, setSidebarWidth] = useState(256);";
code = code.replace(
  stateTarget,
  stateTarget + "\n  const [showBottomPanel, setShowBottomPanel] = useState(false);\n  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);"
);

// 4. Update the terminal button in Explorer header
const terminalButtonTarget = `store.openWindow({ appId: 'terminal', payload: { cwd: workspace }, title: 'Terminal', x: 250, y: 200, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false } as any);`;
const newTerminalButton = `setShowBottomPanel(prev => !prev);`;
code = code.replace(terminalButtonTarget, newTerminalButton);

// 5. Inject bottom panel below editor content
const bottomPanelTarget = `        </div>
      </div>
      
      {/* VSCode Style Prompt Modal */}`;

const bottomPanelCode = `        </div>
        
        {/* Bottom Panel (Integrated Terminal) */}
        {showBottomPanel && (
          <div style={{ height: bottomPanelHeight }} className="flex flex-col border-t border-[#3e3e42] bg-[#1e1e1e] relative shrink-0">
            {/* Panel Resizer */}
            <div 
              className="h-[4px] bg-transparent hover:bg-blue-500 cursor-row-resize absolute top-0 left-0 right-0 z-10 -mt-[2px] transition-colors"
              onPointerDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startH = bottomPanelHeight;
                const onMove = (moveEvent: PointerEvent) => {
                  const newH = Math.max(100, Math.min(800, startH - (moveEvent.clientY - startY)));
                  setBottomPanelHeight(newH);
                };
                const onUp = () => {
                  document.removeEventListener('pointermove', onMove as any);
                  document.removeEventListener('pointerup', onUp);
                  document.removeEventListener('pointercancel', onUp);
                };
                document.addEventListener('pointermove', onMove as any);
                document.addEventListener('pointerup', onUp);
                document.addEventListener('pointercancel', onUp);
              }}
            />
            {/* Panel Header */}
            <div className="flex items-center px-4 h-9 shrink-0">
              <div className="text-[11px] uppercase tracking-wider text-gray-300 border-b border-blue-500 h-full flex items-center px-2">Terminal</div>
              <div className="flex-1"></div>
              <button onClick={() => setShowBottomPanel(false)} className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
            </div>
            {/* Terminal Container */}
            <div className="flex-1 p-2 min-h-0 pl-4">
              <IntegratedTerminal workspace={workspace} winId={winId} />
            </div>
          </div>
        )}
      </div>
      
      {/* VSCode Style Prompt Modal */}`;

code = code.replace(bottomPanelTarget, bottomPanelCode);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
