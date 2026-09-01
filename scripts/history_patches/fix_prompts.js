const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

// 1. Add state
const stateTarget = `  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);`;
const stateReplacement = stateTarget + `\n  const [promptModal, setPromptModal] = useState<{type: 'folder' | 'file', onSubmit: (name: string) => void} | null>(null);`;
code = code.replace(stateTarget, stateReplacement);

// 2. Change handleCreateFolder
const folderTarget = `  const handleCreateFolder = async () => {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    const res = await fetch(\`\${BASE}/api/files/folder\`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: currentPath, name })
    });
    if (res.ok) loadFiles(currentPath);
  };`;
const folderReplacement = `  const handleCreateFolder = () => {
    setPromptModal({
      type: 'folder',
      onSubmit: async (name) => {
        if (!name?.trim()) return;
        const res = await fetch(\`\${BASE}/api/files/folder\`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: currentPath, name })
        });
        if (res.ok) loadFiles(currentPath);
      }
    });
  };`;
code = code.replace(folderTarget, folderReplacement);

// 3. Change handleCreateFile
const fileTarget = `  const handleCreateFile = async () => {
    const name = prompt('File name:');
    if (!name?.trim()) return;
    const res = await fetch(\`\${BASE}/api/files/file\`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: currentPath, name, content: '' })
    });
    if (res.ok) loadFiles(currentPath);
  };`;
const fileReplacement = `  const handleCreateFile = () => {
    setPromptModal({
      type: 'file',
      onSubmit: async (name) => {
        if (!name?.trim()) return;
        const res = await fetch(\`\${BASE}/api/files/file\`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: currentPath, name, content: '' })
        });
        if (res.ok) loadFiles(currentPath);
      }
    });
  };`;
code = code.replace(fileTarget, fileReplacement);

// 4. Add the Modal JSX at the end, just before Context Menu
const jsxTarget = `{/* Context Menu */}`;
const jsxReplacement = `      {/* Prompt Modal */}
      {promptModal && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40 backdrop-blur-[1px]" onClick={() => setPromptModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-72 overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-sm text-gray-800">{promptModal.type === 'folder' ? 'Create New Folder' : 'Create New File'}</h3>
            </div>
            <div className="p-4">
              <input
                autoFocus
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
            <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button onClick={() => setPromptModal(null)} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors">Cancel</button>
              <button onClick={(e) => {
                const input = e.currentTarget.parentElement?.previousElementSibling?.querySelector('input');
                if (input?.value) promptModal.onSubmit(input.value);
                setPromptModal(null);
              }} className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}`;
code = code.replace(jsxTarget, jsxReplacement);

fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
