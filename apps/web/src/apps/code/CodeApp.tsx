import { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../../stores/windowStore';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { 
  Folder, File, ChevronRight, ChevronDown, FileCode2, FileJson, FileText,
  Search, GitBranch, Settings, LayoutPanelLeft, FolderPlus, X, FilePlus, TerminalSquare, RefreshCw, Plus, Trash2
} from 'lucide-react';

interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
}

function FileTreeNode({ 
  name, path, isDir, level, onSelectFile, expandedPaths, toggleExpand, onAction, onContextMenu
}: { 
  name: string, path: string, isDir: boolean, level: number, 
  onSelectFile: (p: string) => void, 
  expandedPaths: Set<string>, toggleExpand: (p: string) => void,
  onContextMenu?: (e: any, path: string, isDir: boolean) => void,
  onAction: (e: any, action: string, path: string) => void
}) {
  const isExpanded = expandedPaths.has(path);
  const [children, setChildren] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  const ignoreClickRef = useRef(false);

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return; // Only care about primary click/touch
    
    timerRef.current = setTimeout(() => {
      if (onContextMenu) {
        if (navigator.vibrate) navigator.vibrate(50);
        onContextMenu({ preventDefault: ()=>{}, stopPropagation: ()=>{}, clientX: e.clientX, clientY: e.clientY }, path, isDir);
        timerRef.current = null;
        ignoreClickRef.current = true; // Block the upcoming click
      }
    }, 600);
  };

  const handlePointerUpOrMove = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: any) => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isDir ? toggleExpand(path) : onSelectFile(path);
  };






  useEffect(() => {
    if (isDir && isExpanded && children.length === 0) {
      setLoading(true);
      const baseUrl = `http://${window.location.hostname}:3030`;
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
        className="flex items-center py-1 hover:bg-[#2a2d2e] cursor-pointer text-gray-300 group select-none [-webkit-touch-callout:none]"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if(onContextMenu) onContextMenu(e, path, isDir); }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrMove}
        onPointerMove={handlePointerUpOrMove}
        onPointerCancel={handlePointerUpOrMove}
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
                onContextMenu={onContextMenu}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}


function IntegratedTerminal({ workspace, termId }: { workspace: string, termId: string }) {
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

    const wsUrl = `ws://${window.location.hostname}:3030/ws/terminal?termId=${encodeURIComponent(termId)}&cwd=${encodeURIComponent(workspace)}`;
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
  }, [workspace, termId]);

  return <div ref={terminalRef} className="w-full h-full" />;
}

export default function CodeApp({ initialPath = '', winId = '' }: { initialPath?: string, winId?: string }) {
  const store = useWindowStore();
  const [promptModal, setPromptModal] = useState<{type: 'folder' | 'file', onSubmit: (name: string) => void} | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string, isDir: boolean } | null>(null);

  const handleOpenNewWindow = () => {
    if (!contextMenu) return;
    store.openWindow({
      appId: 'code',
      title: 'NebuCode',
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      width: 900,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      minimized: false,
      maximized: false,
      path: contextMenu.path
    } as any, true);
    setContextMenu(null);
  };

  const getInitialWorkspace = () => {
    if (!initialPath) return '/root';
    const parts = initialPath.split('/');
    if (parts.length > 1 && parts[parts.length - 1].includes('.')) {
      return parts.slice(0, -1).join('/') || '/';
    }
    return initialPath;
  };

  const [workspace, setWorkspace] = useState(() => localStorage.getItem(`nebucode_workspace_${winId}`) || getInitialWorkspace());
  
  useEffect(() => {
    localStorage.setItem(`nebucode_workspace_${winId}`, workspace);
  }, [workspace, winId]);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileEntry[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([workspace]));
  
  // Editor State
  const [openFiles, setOpenFiles] = useState<{path: string, content: string, original: string, isDirty: boolean}[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeActivity, setActiveActivity] = useState<string | null>(() => localStorage.getItem('nebucode_activity') || 'explorer');
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('nebucode_sidebar')) || 256);
  const [showBottomPanel, setShowBottomPanel] = useState(() => localStorage.getItem('nebucode_terminal_open') === 'true');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => Number(localStorage.getItem('nebucode_terminal_height')) || 250);

  const [terminals, setTerminals] = useState<{id: string, cwd: string}[]>(() => {
    try {
      const saved = localStorage.getItem(`nebucode_terminals_${winId}`);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [{ id: '1', cwd: workspace }];
  });
  const [activeTermId, setActiveTermId] = useState(() => localStorage.getItem(`nebucode_active_term_${winId}`) || '1');

  useEffect(() => { localStorage.setItem(`nebucode_terminals_${winId}`, JSON.stringify(terminals)); }, [terminals, winId]);
  useEffect(() => { localStorage.setItem(`nebucode_active_term_${winId}`, activeTermId); }, [activeTermId, winId]);

  const addTerminal = (cwd: string = workspace) => {
    const id = Date.now().toString();
    setTerminals(prev => [...prev, { id, cwd }]);
    setActiveTermId(id);
    setShowBottomPanel(true);
  };

  const killTerminal = async (id: string) => {
    try {
      const fullTermId = `${winId}_integrated_${id}`;
      await fetch(`http://${window.location.hostname}:3030/api/terminal/${fullTermId}`, { method: 'DELETE', credentials: 'include' });
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
  };

  useEffect(() => { localStorage.setItem('nebucode_activity', activeActivity || ''); }, [activeActivity]);
  useEffect(() => { localStorage.setItem('nebucode_sidebar', sidebarWidth.toString()); }, [sidebarWidth]);
  useEffect(() => { localStorage.setItem('nebucode_terminal_open', showBottomPanel.toString()); }, [showBottomPanel]);
  useEffect(() => { localStorage.setItem('nebucode_terminal_height', bottomPanelHeight.toString()); }, [bottomPanelHeight]);

  // New states for panels
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [gitStatus, setGitStatus] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.winId === winId) {
        document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
          detail: {
            initialPath: workspace,
            onSelect: (p: string) => {
              setWorkspace(p);
              setExpandedPaths(new Set([p]));
              setOpenFiles([]);
              setActiveFile(null);
            }
          }
        }));
      }
    };
    const directHandler = (e: any) => {
      if (e.detail?.winId === winId && e.detail.path) {
        setWorkspace(e.detail.path);
        setExpandedPaths(new Set([e.detail.path]));
        setOpenFiles([]);
        setActiveFile(null);
      }
    };
    document.addEventListener('nebucode:open-folder', handler);
    document.addEventListener('nebucode:open-folder-direct', directHandler);
    return () => {
      document.removeEventListener('nebucode:open-folder', handler);
      document.removeEventListener('nebucode:open-folder-direct', directHandler);
    };
  }, [winId, workspace]);

  // Load root workspace
  const loadWorkspace = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3030`;
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
      const baseUrl = `http://${window.location.hostname}:3030`;
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
      const baseUrl = `http://${window.location.hostname}:3030`;
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
        const baseUrl = `http://${window.location.hostname}:3030`;
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
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Native-like Titlebar */}
      <div className="h-14 bg-[#333333] border-b border-[#252526] flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div> {/* Space for absolute traffic lights */}
        
        {/* Mock Search / Command Palette in Titlebar */}
        <div className="flex-1 flex justify-center">
           <div className="nebudesk-no-drag bg-[#2d2d2d] text-gray-400 text-xs px-24 py-1.5 rounded flex items-center border border-[#3e3e42] shadow-inner cursor-pointer hover:bg-[#333333] transition-colors"
                onClick={() => setActiveActivity(prev => prev === 'search' ? null : 'search')}
           >
             <Search size={14} className="mr-2" />
             {workspace.split('/').pop() || 'NebuCode'}
           </div>
        </div>
        
        <div className="w-[90px] shrink-0"></div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 space-y-4 shrink-0 border-r border-[#252526]">
        <button 
          onClick={() => setActiveActivity(prev => prev === 'explorer' ? null : 'explorer')}
          className={`p-2 rounded-md ${activeActivity === 'explorer' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
          title="Explorer"
        >
          <LayoutPanelLeft size={24} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setActiveActivity(prev => prev === 'search' ? null : 'search')}
          className={`p-2 rounded-md ${activeActivity === 'search' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
          title="Search"
        >
          <Search size={24} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setActiveActivity(prev => prev === 'git' ? null : 'git')}
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


      {activeActivity && (<>
      {/* Sidebar (Explorer/Search/Git) */}
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
                  const baseUrl = `http://${window.location.hostname}:3030`;
                  await fetch(`${baseUrl}/api/files/create`, {
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
                  const baseUrl = `http://${window.location.hostname}:3030`;
                  await fetch(`${baseUrl}/api/files/create`, {
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
                if (!showBottomPanel && terminals.length === 0) addTerminal(workspace); else setShowBottomPanel(prev => !prev);
              }} title="Open Terminal" className="p-0.5 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><TerminalSquare size={13} /></button>
            </div>
          )}
        </div>
        
        {/* Explorer Panel */}
        <div className={`flex-1 overflow-y-auto outline-none pb-4 ${activeActivity === 'explorer' ? 'block' : 'hidden'}`}>
          <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-400 hover:bg-[#2a2d2e] cursor-default group">
            <div className="flex items-center space-x-1 uppercase cursor-pointer min-w-0" onClick={() => {
              document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                detail: { 
                  initialPath: workspace, 
                  onSelect: (p: string) => {
                    useWindowStore.getState().openWindow({
                      appId: 'code',
                      title: 'NebuCode',
                      x: 150, y: 150,
                      width: 800, height: 600,
                      minWidth: 600, minHeight: 400,
                      minimized: false, maximized: false,
                      path: p
                    } as any, true);
                  }
                }
              }));
            }} title="Open Folder in New Window">
              <ChevronDown size={14} className="shrink-0" />
              <span className="truncate">{workspace.split('/').pop() || 'ROOT'}</span>
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
                  const baseUrl = `http://${window.location.hostname}:3030`;
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
                const baseUrl = `http://${window.location.hostname}:3030`;
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

      {/* Sidebar Resizer */}
      <div 
        className="w-2 bg-transparent hover:bg-blue-500 cursor-col-resize shrink-0 z-10 -ml-[1px] relative transition-colors"
        onPointerDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = sidebarWidth;
          const onMove = (moveEvent: any) => {
            const newW = Math.max(130, Math.min(800, startW + (moveEvent.clientX - startX)));
            setSidebarWidth(newW);
          };
          const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
          };
          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
          document.addEventListener('pointercancel', onUp);
        }}
      />
      </>)}

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
                const onMove = (moveEvent: any) => {
                  const newH = Math.max(100, Math.min(800, startH - (moveEvent.clientY - startY)));
                  setBottomPanelHeight(newH);
                };
                const onUp = () => {
                  document.removeEventListener('pointermove', onMove);
                  document.removeEventListener('pointerup', onUp);
                  document.removeEventListener('pointercancel', onUp);
                };
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
                document.addEventListener('pointercancel', onUp);
              }}
            />
            {/* Panel Header */}
            <div className="flex items-center px-4 h-9 shrink-0 bg-[#1e1e1e]">
              <div className="text-[11px] uppercase tracking-wider text-gray-300 border-b border-blue-500 h-full flex items-center px-2 mr-4 shrink-0">Terminal</div>
              
              <div className="flex-1"></div>

              <div className="flex items-center space-x-2 ml-2 shrink-0">
                <button onClick={() => addTerminal(workspace)} title="New Terminal" className="text-gray-400 hover:text-white p-1 rounded"><Plus size={14}/></button>
                {terminals.length === 1 && (
                  <button onClick={() => killTerminal(terminals[0].id)} title="Kill Terminal" className="text-gray-400 hover:text-white p-1 rounded"><Trash2 size={14}/></button>
                )}
                <button onClick={() => setShowBottomPanel(false)} title="Close Panel" className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
              </div>
            </div>
            {/* Terminal Container & Sidebar */}
            <div className="flex-1 min-h-0 flex relative">
              {/* Terminal Area */}
              <div className="flex-1 p-2 pl-4 relative min-h-0">
                {terminals.map(t => activeTermId === t.id && (
                   <IntegratedTerminal key={t.id} workspace={t.cwd} termId={`${winId}_integrated_${t.id}`} />
                ))}
              </div>
              
              {/* Multi-terminal Right Sidebar */}
              {terminals.length > 1 && (
                <div className="w-32 bg-[#1e1e1e] flex flex-col shrink-0 overflow-y-auto border-l border-[#333] [scrollbar-width:none]">
                  {terminals.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => setActiveTermId(t.id)} 
                      className={`flex items-center justify-between px-2 py-1.5 cursor-pointer text-[11px] group ${activeTermId === t.id ? 'bg-[#2d2d2d] text-white border-l-2 border-blue-500' : 'text-gray-400 hover:bg-[#2a2d2e] border-l-2 border-transparent'}`}
                    >
                      <div className="flex items-center truncate">
                        <TerminalSquare size={12} className="mr-2 opacity-70 shrink-0" />
                        <span className="truncate">bash</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); killTerminal(t.id); }} 
                        className={`p-0.5 rounded hover:bg-gray-600 ${activeTermId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title="Kill Terminal"
                      >
                        <Trash2 size={10}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
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

      {/* Context Menu */} 
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => {e.preventDefault(); setContextMenu(null);}}></div>
          <div 
            className="fixed z-50 bg-[#2d2d2d] border border-[#3e3e42] shadow-xl rounded py-1 min-w-[200px] text-[13px] text-[#cccccc]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button 
              onClick={handleOpenNewWindow}
              className="w-full text-left px-4 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Open in New Window
            </button>
            <div className="border-t border-[#3e3e42] my-1"></div>
                        {contextMenu.isDir && (
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
                 handleAction(e, 'delete', contextMenu.path);
                 setContextMenu(null);
              }}
              className="w-full text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}