const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// 1. Add sidebarWidth state
code = code.replace(
  "const [activeActivity, setActiveActivity] = useState('explorer');",
  "const [activeActivity, setActiveActivity] = useState('explorer');\n  const [sidebarWidth, setSidebarWidth] = useState(256);"
);

// 2. The old sidebar HTML
const oldSidebar = `      {/* Sidebar (Explorer/Search/Git) */}
      <div className="w-64 bg-[#252526] flex flex-col shrink-0 border-r border-[#1e1e1e]">
        <div className="h-9 px-4 flex items-center text-xs font-semibold tracking-wider text-gray-300">
          {activeActivity === 'explorer' && 'EXPLORER'}
          {activeActivity === 'search' && 'SEARCH'}
          {activeActivity === 'git' && 'SOURCE CONTROL'}
        </div>
        
        {/* Explorer Panel */}
        <div className={\`flex-1 overflow-y-auto outline-none pb-4 \${activeActivity === 'explorer' ? 'block' : 'hidden'}\`}>
          <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-400 hover:bg-[#2a2d2e] cursor-default group">
            <div className="flex items-center space-x-1 uppercase cursor-pointer" onClick={() => {
              document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                detail: { initialPath: workspace, onSelect: (p: string) => setWorkspace(p) }
              }));
            }} title="Change Workspace Folder">
              <ChevronDown size={14} />
              <span className="truncate max-w-[90px]">{workspace.split('/').pop() || 'ROOT'}</span>
            </div>
            
            {/* VSCode Style Actions */}
            <div className="flex items-center space-x-1 pr-1">
              <button onClick={(e) => {
                e.stopPropagation();
                setPromptModal({ type: 'file', onSubmit: async (name: string) => {
                  const baseUrl = \`http://\${window.location.hostname}:3030\`;
                  await fetch(\`\${baseUrl}/api/files/create\`, {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: workspace + '/' + name, type: 'file' })
                  });
                  loadWorkspace();
                  openFile(workspace + '/' + name);
                }});
              }} title="New File..." className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><FilePlus size={14} /></button>
              
              <button onClick={(e) => {
                e.stopPropagation();
                setPromptModal({ type: 'folder', onSubmit: async (name: string) => {
                  const baseUrl = \`http://\${window.location.hostname}:3030\`;
                  await fetch(\`\${baseUrl}/api/files/create\`, {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: workspace + '/' + name, type: 'folder' })
                  });
                  loadWorkspace();
                }});
              }} title="New Folder..." className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><FolderPlus size={14} /></button>
              
              <button onClick={(e) => {
                e.stopPropagation();
                loadWorkspace();
              }} title="Refresh Explorer" className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><RefreshCw size={13} /></button>

              <button onClick={(e) => {
                e.stopPropagation();
                store.openWindow({ appId: 'terminal', payload: { cwd: workspace }, title: 'Terminal', x: 250, y: 200, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false } as any);
              }} title="Open Terminal" className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><TerminalSquare size={13} /></button>
            </div>
          </div>`;


const newSidebar = `      {/* Sidebar (Explorer/Search/Git) */}
      <div style={{ width: sidebarWidth }} className="bg-[#252526] flex flex-col shrink-0 border-r border-[#1e1e1e] relative">
        
        <div className="h-9 px-4 flex items-center justify-between text-xs font-semibold tracking-wider text-gray-300">
          <span className="truncate pr-2">
            {activeActivity === 'explorer' && 'EXPLORER'}
            {activeActivity === 'search' && 'SEARCH'}
            {activeActivity === 'git' && 'SOURCE CONTROL'}
          </span>
          
          {/* Moved Actions to EXPLORER header */}
          {activeActivity === 'explorer' && sidebarWidth > 180 && (
            <div className="flex items-center space-x-0.5">
              <button onClick={(e) => {
                e.stopPropagation();
                setPromptModal({ type: 'file', onSubmit: async (name: string) => {
                  const baseUrl = \`http://\${window.location.hostname}:3030\`;
                  await fetch(\`\${baseUrl}/api/files/create\`, {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: workspace + '/' + name, type: 'file' })
                  });
                  loadWorkspace();
                  openFile(workspace + '/' + name);
                }});
              }} title="New File..." className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><FilePlus size={14} /></button>
              
              <button onClick={(e) => {
                e.stopPropagation();
                setPromptModal({ type: 'folder', onSubmit: async (name: string) => {
                  const baseUrl = \`http://\${window.location.hostname}:3030\`;
                  await fetch(\`\${baseUrl}/api/files/create\`, {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: workspace + '/' + name, type: 'folder' })
                  });
                  loadWorkspace();
                }});
              }} title="New Folder..." className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><FolderPlus size={14} /></button>
              
              <button onClick={(e) => {
                e.stopPropagation();
                loadWorkspace();
              }} title="Refresh Explorer" className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><RefreshCw size={13} /></button>

              <button onClick={(e) => {
                e.stopPropagation();
                store.openWindow({ appId: 'terminal', payload: { cwd: workspace }, title: 'Terminal', x: 250, y: 200, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false } as any);
              }} title="Open Terminal" className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><TerminalSquare size={13} /></button>
            </div>
          )}
        </div>
        
        {/* Explorer Panel */}
        <div className={\`flex-1 overflow-y-auto outline-none pb-4 \${activeActivity === 'explorer' ? 'block' : 'hidden'}\`}>
          <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-400 hover:bg-[#2a2d2e] cursor-default group">
            <div className="flex items-center space-x-1 uppercase cursor-pointer min-w-0" onClick={() => {
              document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                detail: { initialPath: workspace, onSelect: (p: string) => setWorkspace(p) }
              }));
            }} title="Change Workspace Folder">
              <ChevronDown size={14} className="shrink-0" />
              <span className="truncate">{workspace.split('/').pop() || 'ROOT'}</span>
            </div>
          </div>`;

code = code.replace(oldSidebar, newSidebar);

// Add resizer drag handle after sidebar
const oldMainEditor = `{/* Main Editor */}`;
const resizer = `{/* Sidebar Resizer */}
        <div 
          className="w-1 bg-transparent hover:bg-blue-500 cursor-col-resize shrink-0 z-10 -ml-[1px] relative transition-colors"
          onPointerDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = sidebarWidth;
            const onMove = (moveEvent: PointerEvent) => {
              const newW = Math.max(130, Math.min(800, startW + (moveEvent.clientX - startX)));
              setSidebarWidth(newW);
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
        />\n        `;
code = code.replace(oldMainEditor, resizer + oldMainEditor);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
