const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

// 1. Add lucide import Columns
code = code.replace(
  "Trash2",
  "Trash2, Columns"
);

// 2. Add splitFile state
code = code.replace(
  "const [activeFile, setActiveFile] = useState<string>('');",
  "const [activeFile, setActiveFile] = useState<string>('');\n  const [splitFile, setSplitFile] = useState<string>('');"
);

// 3. Add Split button to breadcrumbs
code = code.replace(
  "{status && <span className=\"ml-auto text-blue-400\">{status}</span>}",
  "{status && <span className=\"ml-auto text-blue-400 mr-4\">{status}</span>}\n            <button title=\"Split Editor\" className=\"ml-auto p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white\" onClick={() => setSplitFile(splitFile ? '' : activeFile)}><Columns size={14} /></button>"
);
code = code.replace(
  "className=\"ml-auto p-1",
  "className=\"ml-auto p-1"
); // Check if we need to adjust margin if status is missing. Wait, if status is missing, ml-auto goes to button.
code = code.replace(
  "            {status && <span className=\"ml-auto text-blue-400 mr-4\">{status}</span>}\n            <button title=\"Split Editor\"",
  "            <div className=\"ml-auto flex items-center space-x-2\">\n              {status && <span className=\"text-blue-400\">{status}</span>}\n              <button title=\"Split Editor Right\" className=\"p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white\" onClick={() => setSplitFile(splitFile ? '' : activeFile)}><Columns size={14} /></button>\n            </div>"
);

// 4. Update Editor Content layout
const oldEditorSection = `        {/* Editor Content */}
        <div className="flex-1 relative">
          {loading && openFiles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">Loading...</div>
          ) : !activeFile ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" className="w-32 opacity-20 grayscale" alt="VSCode" />
              <div className="text-xl">NebuCode Editor</div>
              <div className="text-sm">Select a file to start editing</div>
            </div>
          ) : (
            <Editor
              height="100%"
              onMount={handleEditorDidMount}
              language={getLang(activeFile)}
              theme="vs-dark"
              value={activeFileData?.content || ''}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: true,
                padding: { top: 10 }
              }}
            />
          )}
        </div>`;

const newEditorSection = `        {/* Editor Content */}
        <div className="flex-1 relative flex min-h-0 bg-[#1e1e1e]">
          {/* Main Pane */}
          <div className={\`flex-1 relative \${splitFile ? 'border-r border-[#333]' : ''}\`}>
            {loading && openFiles.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">Loading...</div>
            ) : !activeFile ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4">
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" className="w-32 opacity-20 grayscale" alt="VSCode" />
                <div className="text-xl">NebuCode Editor</div>
                <div className="text-sm">Select a file to start editing</div>
              </div>
            ) : (
              <Editor
                height="100%"
                onMount={handleEditorDidMount}
                language={getLang(activeFile)}
                theme="vs-dark"
                value={activeFileData?.content || ''}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  formatOnPaste: true,
                  padding: { top: 10 }
                }}
              />
            )}
          </div>
          
          {/* Split Pane Right */}
          {splitFile && (
            <div className="flex-1 relative">
              <div className="h-6 flex items-center px-4 text-xs font-semibold text-gray-400 bg-[#1e1e1e] border-b border-[#2d2d2d] absolute top-0 left-0 right-0 z-10">
                <span className="truncate">{splitFile.split('/').pop()}</span>
                <button onClick={() => setSplitFile('')} className="ml-auto p-0.5 hover:bg-[#333] rounded"><X size={12}/></button>
              </div>
              <div className="absolute inset-0 top-6">
                <Editor
                  height="100%"
                  language={getLang(splitFile)}
                  theme="vs-dark"
                  value={openFiles.find(f => f.path === splitFile)?.content || ''}
                  onChange={(val) => {
                    setOpenFiles(prev => prev.map(f => {
                      if (f.path === splitFile) return { ...f, content: val || '', isDirty: (val || '') !== f.original };
                      return f;
                    }));
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    formatOnPaste: true,
                    padding: { top: 10 }
                  }}
                />
              </div>
            </div>
          )}
        </div>`;

code = code.replace(oldEditorSection, newEditorSection);

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
