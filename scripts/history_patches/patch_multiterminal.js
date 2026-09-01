const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// 1. Imports
code = code.replace(
  "Search, GitBranch, Settings, LayoutPanelLeft, FolderPlus, X, FilePlus, TerminalSquare, RefreshCw",
  "Search, GitBranch, Settings, LayoutPanelLeft, FolderPlus, X, FilePlus, TerminalSquare, RefreshCw, Plus, Trash2"
);

// 2. IntegratedTerminal termId prop
code = code.replace(
  "function IntegratedTerminal({ workspace, winId }: { workspace: string, winId: string }) {",
  "function IntegratedTerminal({ workspace, termId }: { workspace: string, termId: string }) {"
);
code = code.replace(
  "const wsUrl = `ws://${window.location.hostname}:3030/ws/terminal?termId=${encodeURIComponent(winId + '_integrated')}&cwd=${encodeURIComponent(workspace)}`;",
  "const wsUrl = `ws://${window.location.hostname}:3030/ws/terminal?termId=${encodeURIComponent(termId)}&cwd=${encodeURIComponent(workspace)}`;"
);

// 3. States and functions
const targetState = `  const [showBottomPanel, setShowBottomPanel] = useState(() => localStorage.getItem('nebucode_terminal_open') === 'true');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => Number(localStorage.getItem('nebucode_terminal_height')) || 250);`;

const newStates = `  const [showBottomPanel, setShowBottomPanel] = useState(() => localStorage.getItem('nebucode_terminal_open') === 'true');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => Number(localStorage.getItem('nebucode_terminal_height')) || 250);

  const [terminals, setTerminals] = useState<{id: string, cwd: string}[]>(() => {
    try {
      const saved = localStorage.getItem(\`nebucode_terminals_\${winId}\`);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [{ id: '1', cwd: workspace }];
  });
  const [activeTermId, setActiveTermId] = useState(() => localStorage.getItem(\`nebucode_active_term_\${winId}\`) || '1');

  useEffect(() => { localStorage.setItem(\`nebucode_terminals_\${winId}\`, JSON.stringify(terminals)); }, [terminals, winId]);
  useEffect(() => { localStorage.setItem(\`nebucode_active_term_\${winId}\`, activeTermId); }, [activeTermId, winId]);

  const addTerminal = (cwd: string = workspace) => {
    const id = Date.now().toString();
    setTerminals(prev => [...prev, { id, cwd }]);
    setActiveTermId(id);
    setShowBottomPanel(true);
  };

  const killTerminal = async (id: string) => {
    try {
      const fullTermId = \`\${winId}_integrated_\${id}\`;
      await fetch(\`http://\${window.location.hostname}:3030/api/terminal/\${fullTermId}\`, { method: 'DELETE', credentials: 'include' });
    } catch(e) {}
    
    setTerminals(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) setShowBottomPanel(false);
      return next;
    });
    if (activeTermId === id) {
      const remaining = terminals.filter(t => t.id !== id);
      if (remaining.length > 0) setActiveTermId(remaining[remaining.length - 1].id);
    }
  };`;
code = code.replace(targetState, newStates);

// 4. Update the toggle terminal button in Explorer Header
code = code.replace(
  "setShowBottomPanel(prev => !prev);",
  "if (!showBottomPanel && terminals.length === 0) addTerminal(workspace); else setShowBottomPanel(prev => !prev);"
);

// 5. Update Bottom Panel
const oldBottomPanel = `            {/* Panel Header */}
            <div className="flex items-center px-4 h-9 shrink-0">
              <div className="text-[11px] uppercase tracking-wider text-gray-300 border-b border-blue-500 h-full flex items-center px-2">Terminal</div>
              <div className="flex-1"></div>
              <button onClick={() => setShowBottomPanel(false)} className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
            </div>
            {/* Terminal Container */}
            <div className="flex-1 p-2 min-h-0 pl-4">
              <IntegratedTerminal workspace={workspace} winId={winId} />
            </div>`;

const newBottomPanel = `            {/* Panel Header */}
            <div className="flex items-center px-4 h-9 shrink-0 bg-[#1e1e1e]">
              <div className="text-[11px] uppercase tracking-wider text-gray-300 border-b border-blue-500 h-full flex items-center px-2 mr-4 shrink-0">Terminal</div>
              
              <div className="flex-1 flex items-center space-x-1 h-full overflow-x-auto [scrollbar-width:none]">
                {terminals.map(t => (
                  <div key={t.id} onClick={() => setActiveTermId(t.id)} className={\`flex items-center space-x-2 h-full px-3 cursor-pointer text-xs group \${activeTermId === t.id ? 'bg-[#2d2d2d] text-white' : 'text-gray-400 hover:bg-[#2d2d2d]'}\`}>
                    <span>bash</span>
                    <button onClick={(e) => { e.stopPropagation(); killTerminal(t.id); }} className={\`p-0.5 rounded hover:bg-gray-600 \${activeTermId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2 ml-2 shrink-0">
                <button onClick={() => addTerminal(workspace)} className="text-gray-400 hover:text-white p-1 rounded"><Plus size={14}/></button>
                <button onClick={() => setShowBottomPanel(false)} className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
              </div>
            </div>
            {/* Terminal Container */}
            <div className="flex-1 p-2 min-h-0 pl-4 relative">
              {terminals.map(t => activeTermId === t.id && (
                 <IntegratedTerminal key={t.id} workspace={t.cwd} termId={\`\${winId}_integrated_\${t.id}\`} />
              ))}
            </div>`;

code = code.replace(oldBottomPanel, newBottomPanel);

// 6. Context Menu Open in Integrated Terminal
const oldDeleteBtn = `<button 
              onClick={(e) => {
                 handleAction(e, 'delete', contextMenu.path);`;

const contextMenuInjection = `            {contextMenu.isDir && (
              <button 
                onClick={() => {
                  addTerminal(contextMenu.path);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
              >
                Open in Integrated Terminal
              </button>
            )}
            <div className="border-t border-[#3e3e42] my-1"></div>
            <button 
              onClick={(e) => {
                 handleAction(e, 'delete', contextMenu.path);`;

code = code.replace(oldDeleteBtn, contextMenuInjection);

// Clean up any double lines from the original delete btn separator if I injected it
code = code.replace(/<div className="border-t border-\[#3e3e42\] my-1"><\/div>\s*<div className="border-t border-\[#3e3e42\] my-1"><\/div>/g, '<div className="border-t border-[#3e3e42] my-1"></div>');

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
