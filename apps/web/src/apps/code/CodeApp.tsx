import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Folder, File, ChevronRight, ChevronDown, FileCode2, FileJson, FileText,
  Search, GitBranch, Settings, LayoutPanelLeft, FolderPlus, Trash2, X
} from 'lucide-react';

interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
}

function FileTreeNode({ 
  name, path, isDir, level, onSelectFile, expandedPaths, toggleExpand, onAction
}: { 
  name: string, path: string, isDir: boolean, level: number, 
  onSelectFile: (p: string) => void, 
  expandedPaths: Set<string>, toggleExpand: (p: string) => void,
  onAction: (e: any, action: string, path: string) => void
}) {
  const isExpanded = expandedPaths.has(path);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDir && isExpanded && children.length === 0) {
      setLoading(true);
      const baseUrl = `http://${window.location.hostname}:3001`;
      fetch(`${baseUrl}/api/files?p=${encodeURIComponent(path)}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Sort: folders first, then files
            const sorted = data.sort((a, b) => {
              if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
              return a.isDir ? -1 : 1;
            });
            setChildren(sorted);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isDir, isExpanded, path, children.length]);

  const getFileIcon = (name: string) => {
    if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js')) return <FileCode2 size={15} className="text-yellow-400" />;
    if (name.endsWith('.json')) return <FileJson size={15} className="text-green-400" />;
    if (name.endsWith('.md')) return <FileText size={15} className="text-blue-300" />;
    return <File size={15} className="text-gray-400" />;
  };

  return (
    <div>
      <div 
        className="flex items-center py-1 hover:bg-[#2a2d2e] cursor-pointer text-gray-300 group"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => isDir ? toggleExpand(path) : onSelectFile(path)}
      >
        <div className="w-4 h-4 mr-1 flex items-center justify-center">
          {isDir ? (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : null}
        </div>
        <div className="mr-1.5 flex items-center">
          {isDir ? (
            <Folder size={15} className={isExpanded ? "text-blue-400" : "text-gray-400"} />
          ) : (
            getFileIcon(name)
          )}
        </div>
        <span className="text-sm truncate flex-1 select-none">{name}</span>
        
        {/* Actions (Delete) */}
        <div className="opacity-0 group-hover:opacity-100 pr-2 flex items-center">
          <button 
            onClick={(e) => onAction(e, 'delete', path)}
            className="p-0.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      {isDir && isExpanded && (
        <div>
          {loading ? (
            <div className="text-xs text-gray-500 py-1" style={{ paddingLeft: `${(level+1) * 12 + 28}px` }}>Loading...</div>
          ) : children.length === 0 ? (
            <div className="text-xs text-gray-500 py-1" style={{ paddingLeft: `${(level+1) * 12 + 28}px` }}>Empty</div>
          ) : (
            children.map(child => (
              <FileTreeNode 
                key={child.name}
                name={child.name}
                path={path === '/' ? `/${child.name}` : `${path}/${child.name}`}
                isDir={child.isDir}
                level={level + 1}
                onSelectFile={onSelectFile}
                expandedPaths={expandedPaths}
                toggleExpand={toggleExpand}
                onAction={onAction}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function CodeApp({ initialPath = '' }: { initialPath?: string }) {
  const [workspace, setWorkspace] = useState('/root');
  const [workspaceFiles, setWorkspaceFiles] = useState<FileEntry[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/root']));
  
  // Editor State
  const [openFiles, setOpenFiles] = useState<{path: string, content: string, original: string, isDirty: boolean}[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeActivity, setActiveActivity] = useState('explorer');

  // New states for panels
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [gitStatus, setGitStatus] = useState<any>(null);

  // Load root workspace
  const loadWorkspace = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/files?p=${encodeURIComponent(workspace)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: any, b: any) => {
          if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
          return a.isDir ? -1 : 1;
        });
        setWorkspaceFiles(sorted);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadWorkspace();
  }, [workspace]);

  // If opened via double click in FilesApp
  useEffect(() => {
    if (initialPath) {
      openFile(initialPath);
      // Auto expand folders leading to it
      const parts = initialPath.split('/').filter(Boolean);
      let p = '';
      const newExpanded = new Set(expandedPaths);
      for (let i = 0; i < parts.length - 1; i++) {
        p += '/' + parts[i];
        newExpanded.add(p);
      }
      setExpandedPaths(newExpanded);
    }
  }, [initialPath]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedPaths(newExpanded);
  };

  const openFile = async (path: string) => {
    // Check if already open
    if (openFiles.find(f => f.path === path)) {
      setActiveFile(path);
      return;
    }
    
    setLoading(true);
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/files/content?p=${encodeURIComponent(path)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      
      setOpenFiles(prev => [...prev, { path, content: data.content, original: data.content, isDirty: false }]);
      setActiveFile(path);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setTimeout(() => setStatus(''), 3000);
    }
    setLoading(false);
  };

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    
    const closingIdx = openFiles.findIndex(f => f.path === path);
    
    setOpenFiles(prev => prev.filter(f => f.path !== path));
    
    if (activeFile === path) {
      // Pick next or previous
      const nextFiles = openFiles.filter(f => f.path !== path);
      if (nextFiles.length > 0) {
        const nextIdx = Math.min(closingIdx, nextFiles.length - 1);
        setActiveFile(nextFiles[nextIdx].path);
      } else {
        setActiveFile(null);
      }
    }
  };

  const saveFile = async (path: string) => {
    const file = openFiles.find(f => f.path === path);
    if (!file || !file.isDirty) return;
    
    setStatus(`Saving ${path.split('/').pop()}...`);
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/files/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ p: path, content: file.content })
      });
      if (!res.ok) throw new Error('Failed to save file');
      
      setOpenFiles(prev => prev.map(f => f.path === path ? { ...f, original: f.content, isDirty: false } : f));
      setStatus(`Saved ${path.split('/').pop()}`);
      setTimeout(() => setStatus(''), 2000);
    } catch (e: any) {
      setStatus(`Save failed: ${e.message}`);
    }
  };

  const handleEditorChange = (val: string | undefined) => {
    if (!activeFile) return;
    setOpenFiles(prev => prev.map(f => {
      if (f.path === activeFile) {
        return { ...f, content: val || '', isDirty: (val || '') !== f.original };
      }
      return f;
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (activeFile) saveFile(activeFile);
    }
  };

  const handleAction = async (e: any, action: string, path: string) => {
    e.stopPropagation();
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${path}?`)) return;
      try {
        const baseUrl = `http://${window.location.hostname}:3001`;
        await fetch(`${baseUrl}/api/files?p=${encodeURIComponent(path)}`, { 
          method: 'DELETE', credentials: 'include' 
        });
        // Remove from open files if open
        setOpenFiles(prev => prev.filter(f => !f.path.startsWith(path)));
        if (activeFile?.startsWith(path)) setActiveFile(null);
        
        // Reload parent directory implicitly by triggering a re-fetch? 
        // For simplicity just reload workspace root.
        loadWorkspace();
      } catch (err) {}
    }
  };

  const activeFileData = openFiles.find(f => f.path === activeFile);

  // Simple heuristic for language
  const getLang = (p: string) => {
    const ext = p.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'ts': 'typescript', 'tsx': 'typescript',
      'js': 'javascript', 'jsx': 'javascript',
      'json': 'json', 'html': 'html', 'css': 'css',
      'md': 'markdown', 'py': 'python', 'sh': 'shell',
      'yaml': 'yaml', 'yml': 'yaml', 'sql': 'sql', 'xml': 'xml'
    };
    return langMap[ext] || 'plaintext';
  };

  return (
    <div className="h-full flex bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Activity Bar */}
      <div className="w-12 bg-[#333333] flex flex-col items-center py-2 space-y-4 shrink-0 border-r border-[#252526]">
        <button 
          onClick={() => setActiveActivity('explorer')}
          className={`p-2 rounded-md ${activeActivity === 'explorer' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
          title="Explorer"
        >
          <LayoutPanelLeft size={24} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setActiveActivity('search')}
          className={`p-2 rounded-md ${activeActivity === 'search' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
          title="Search"
        >
          <Search size={24} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setActiveActivity('git')}
          className={`p-2 rounded-md ${activeActivity === 'git' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
          title="Source Control"
        >
          <GitBranch size={24} strokeWidth={1.5} />
        </button>
        <div className="flex-1"></div>
        <button className="p-2 text-gray-400 hover:text-gray-200" title="Settings">
          <Settings size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* Sidebar (Explorer/Search/Git) */}
      <div className="w-64 bg-[#252526] flex flex-col shrink-0 border-r border-[#1e1e1e]">
        <div className="h-9 px-4 flex items-center text-xs font-semibold tracking-wider text-gray-300">
          {activeActivity === 'explorer' && 'EXPLORER'}
          {activeActivity === 'search' && 'SEARCH'}
          {activeActivity === 'git' && 'SOURCE CONTROL'}
        </div>
        
        {/* Explorer Panel */}
        <div className={`flex-1 overflow-y-auto outline-none pb-4 ${activeActivity === 'explorer' ? 'block' : 'hidden'}`}>
          <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-400 hover:bg-[#2a2d2e] cursor-pointer group">
            <div className="flex items-center space-x-1 uppercase" onClick={() => {
              const p = prompt('Enter workspace path:', workspace);
              if (p) setWorkspace(p);
            }}>
              <ChevronDown size={14} />
              <span>{workspace.split('/').pop() || 'ROOT'}</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex space-x-1 pr-1">
              <button onClick={(e) => {
                e.stopPropagation();
                const p = prompt('Enter workspace path:', workspace);
                if (p) setWorkspace(p);
              }} title="Open Folder" className="p-0.5 hover:bg-gray-600 rounded"><FolderPlus size={14} /></button>
            </div>
          </div>
          
          <div className="mt-1">
            {workspaceFiles.map(child => (
              <FileTreeNode 
                key={child.name}
                name={child.name}
                path={workspace === '/' ? `/${child.name}` : `${workspace}/${child.name}`}
                isDir={child.isDir}
                level={0}
                onSelectFile={openFile}
                expandedPaths={expandedPaths}
                toggleExpand={toggleExpand}
                onAction={handleAction}
              />
            ))}
          </div>
        </div>

        {/* Search Panel */}
        <div className={`flex-1 flex flex-col p-4 ${activeActivity === 'search' ? 'block' : 'hidden'}`}>
          <input 
            type="text" 
            placeholder="Search files (min 2 chars)..."
            className="w-full bg-[#3c3c3c] text-white px-2 py-1 text-sm border border-[#3c3c3c] focus:border-blue-500 outline-none mb-2"
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const q = (e.target as HTMLInputElement).value;
                if (q.length < 2) return;
                setStatus('Searching...');
                try {
                  const baseUrl = `http://${window.location.hostname}:3001`;
                  const res = await fetch(`${baseUrl}/api/files/search?p=${encodeURIComponent(workspace)}&q=${encodeURIComponent(q)}`, { credentials: 'include' });
                  const data = await res.json();
                  setSearchResults(data.results);
                  setStatus(`Found ${data.results.length} results`);
                } catch(e) {}
              }
            }}
          />
          <div className="text-xs text-gray-400 mt-2">
            {searchResults?.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((r: string) => (
                  <div key={r} className="cursor-pointer hover:bg-[#2a2d2e] py-1 px-1 truncate" onClick={() => openFile(r)}>{r}</div>
                ))}
              </div>
            ) : "No results or search not started."}
          </div>
        </div>

        {/* Git Panel */}
        <div className={`flex-1 flex flex-col p-4 ${activeActivity === 'git' ? 'block' : 'hidden'}`}>
          <button 
            className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded mb-4"
            onClick={async () => {
              setStatus('Checking Git status...');
              try {
                const baseUrl = `http://${window.location.hostname}:3001`;
                const res = await fetch(`${baseUrl}/api/git/status?p=${encodeURIComponent(workspace)}`, { credentials: 'include' });
                const data = await res.json();
                if (data.notRepo) {
                  setStatus('Not a git repository');
                  setGitStatus(null);
                } else {
                  setGitStatus(data);
                  setStatus(`Git branch: ${data.branch}`);
                }
              } catch(e) {}
            }}
          >
            Refresh Git Status
          </button>
          <div className="text-xs text-gray-300">
            {gitStatus ? (
              <div>
                <div className="font-bold mb-2">Branch: {gitStatus.branch}</div>
                <div className="space-y-1">
                  {gitStatus.files.map((f: any) => (
                    <div key={f.file} className="flex justify-between hover:bg-[#2a2d2e] py-1 px-1 cursor-pointer" onClick={() => openFile(workspace + '/' + f.file)}>
                      <span className="truncate flex-1" title={f.file}>{f.file}</span>
                      <span className={`w-4 text-center font-bold ${f.status.includes('M') ? 'text-yellow-400' : 'text-green-400'}`}>{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : "Click refresh to load status"}
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Tabs */}
        <div className="flex h-9 bg-[#2d2d2d] overflow-x-auto overflow-y-hidden select-none [scrollbar-width:none]">
          {openFiles.map(f => {
            const name = f.path.split('/').pop();
            const isActive = activeFile === f.path;
            return (
              <div 
                key={f.path}
                onClick={() => setActiveFile(f.path)}
                className={`flex items-center h-full px-3 text-sm min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] cursor-pointer group ${isActive ? 'bg-[#1e1e1e] text-white border-t border-t-blue-500' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#2b2b2b]'}`}
              >
                <div className="mr-2 opacity-70">
                  {name?.endsWith('.ts') ? <FileCode2 size={14} className="text-yellow-400" /> : <File size={14} />}
                </div>
                <span className="truncate flex-1" title={f.path}>{name}</span>
                {f.isDirty && <div className="w-2 h-2 rounded-full bg-white ml-2 opacity-50"></div>}
                <button 
                  onClick={(e) => closeFile(e, f.path)}
                  className={`ml-1 p-0.5 rounded hover:bg-[#444] ${f.isDirty ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isActive ? 'opacity-100' : ''}`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Status Bar Top (Breadcrumbs) */}
        {activeFile && (
          <div className="h-6 flex items-center px-4 text-xs text-gray-400 bg-[#1e1e1e] border-b border-[#2d2d2d]">
            {activeFile.split('/').filter(Boolean).map((part, i, arr) => (
              <span key={i} className="flex items-center">
                <span className="hover:text-gray-200 cursor-pointer">{part}</span>
                {i < arr.length - 1 && <ChevronRight size={14} className="mx-0.5 opacity-50" />}
              </span>
            ))}
            {status && <span className="ml-auto text-blue-400">{status}</span>}
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 relative">
          {loading && openFiles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">Loading...</div>
          ) : !activeFile ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" className="w-32 opacity-20 grayscale" alt="VSCode" />
              <div className="text-xl">NebuCode Editor</div>
              <div className="text-sm">Select a file from the explorer to begin</div>
            </div>
          ) : (
            <Editor
              height="100%"
              language={getLang(activeFile)}
              theme="vs-dark"
              value={activeFileData?.content || ''}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: true,
                padding: { top: 16 }
              }}
            />
          )}
        </div>
        
        {/* Status Bar Bottom */}
        <div className="h-6 bg-[#007acc] text-white flex items-center px-3 text-xs justify-between">
          <div className="flex space-x-3">
            <span className="flex items-center hover:bg-white/20 px-1 cursor-pointer"><GitBranch size={12} className="mr-1" /> master*</span>
            <span className="hover:bg-white/20 px-1 cursor-pointer">0 errors, 0 warnings</span>
          </div>
          <div className="flex space-x-4">
            <span className="hover:bg-white/20 px-1 cursor-pointer">UTF-8</span>
            <span className="hover:bg-white/20 px-1 cursor-pointer">{activeFile ? getLang(activeFile) : 'Plain Text'}</span>
            <span className="hover:bg-white/20 px-1 cursor-pointer">Prettier</span>
          </div>
        </div>
      </div>
    </div>
  );
}
