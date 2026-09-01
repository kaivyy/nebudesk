const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// 1. Import new icons
code = code.replace(
  "FolderPlus, Trash2, X",
  "FolderPlus, Trash2, X, FilePlus, TerminalSquare, RefreshCw"
);

// 2. Add PromptModal state to CodeApp
const codeAppDef = "const ignoreClickRef = useRef(false);";
const modalState = `  const [promptModal, setPromptModal] = useState<{type: 'folder' | 'file', onSubmit: (name: string) => void} | null>(null);`;
code = code.replace(codeAppDef, codeAppDef + "\n" + modalState);

// 3. Replace the Explorer Header to look like VSCode
const oldExplorerHeader = `<div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-400 hover:bg-[#2a2d2e] cursor-pointer group">
            <div className="flex items-center space-x-1 uppercase" onClick={() => {
              document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                detail: {
                  initialPath: workspace,
                  onSelect: (p: string) => setWorkspace(p)
                }
              }));
            }}>
              <ChevronDown size={14} />
              <span>{workspace.split('/').pop() || 'ROOT'}</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex space-x-1 pr-1">
              <button onClick={(e) => {
                e.stopPropagation();
                document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                  detail: {
                    initialPath: workspace,
                    onSelect: (p: string) => setWorkspace(p)
                  }
                }));
              }} title="Open Folder" className="p-0.5 hover:bg-gray-600 rounded"><FolderPlus size={14} /></button>
            </div>
          </div>`;

const newExplorerHeader = `<div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-400 hover:bg-[#2a2d2e] cursor-default group">
            <div className="flex items-center space-x-1 uppercase cursor-pointer" onClick={() => {
              document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                detail: { initialPath: workspace, onSelect: (p: string) => setWorkspace(p) }
              }));
            }} title="Change Workspace Folder">
              <ChevronDown size={14} />
              <span className="truncate max-w-[90px]">{workspace.split('/').pop() || 'ROOT'}</span>
            </div>
            
            {/* VSCode Style Actions */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pr-1">
              <button onClick={(e) => {
                e.stopPropagation();
                setPromptModal({ type: 'file', onSubmit: async (name) => {
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
                setPromptModal({ type: 'folder', onSubmit: async (name) => {
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
                store.openWindow({ appId: 'terminal', title: 'Terminal', x: 250, y: 200, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false } as any);
              }} title="Open Terminal" className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><TerminalSquare size={13} /></button>
            </div>
          </div>`;

code = code.replace(oldExplorerHeader, newExplorerHeader);

// 4. Inject PromptModal at the end of the return statement before the ContextMenu
const promptModalUI = `
      {/* VSCode Style Prompt Modal */}
      {promptModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-[1px]" onClick={() => setPromptModal(null)}>
          <div className="bg-[#252526] rounded-md shadow-2xl w-80 overflow-hidden border border-[#3e3e42]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-2 border-b border-[#3e3e42] bg-[#2d2d2d]">
              <h3 className="font-semibold text-[13px] text-gray-300">{promptModal.type === 'folder' ? 'Create New Folder' : 'Create New File'}</h3>
            </div>
            <div className="p-4">
              <input
                autoFocus
                type="text"
                className="w-full bg-[#3c3c3c] border border-[#3e3e42] text-[#cccccc] rounded px-3 py-1.5 text-[13px] focus:outline-none focus:border-blue-500"
                placeholder={promptModal.type === 'folder' ? 'Folder name...' : 'File name...'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    promptModal.onSubmit(e.currentTarget.value);
                    setPromptModal(null);
                  } else if (e.key === 'Escape') {
                    setPromptModal(null);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
`;

code = code.replace("{/* Context Menu */}", promptModalUI + "\n      {/* Context Menu */} ");

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done');
