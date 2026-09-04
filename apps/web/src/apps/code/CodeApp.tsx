import { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../../stores/windowStore';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { 
  Folder, File, ChevronRight, ChevronDown, FileCode2, FileJson, FileText,
  Search, GitBranch, Settings, LayoutPanelLeft, FolderPlus, X, Play, FilePlus, 
  TerminalSquare, RefreshCw, Plus, Trash2, Columns, Globe, Edit2, Copy, 
  Scissors, Clipboard, ExternalLink, Clock, Replace, CaseSensitive,
  RotateCcw, Minus, Check, Download, ArrowDown, ArrowUp,
  Activity, Square, Hammer, CheckCircle2,
  AlertCircle, AlertTriangle, Info, Filter
} from 'lucide-react';
import { WS_BASE_URL, apiFetch, apiJson } from '../../config/api';
import { safeStorage } from '../../utils/safeStorage';

export interface DiagnosticItem {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  source?: string;
}

interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
}

interface OpenFile {
  path: string;
  content: string;
  original: string;
  isDirty: boolean;
}

interface GrepMatch {
  file: string;
  line: number;
  column: number;
  preview: string;
}

interface ClipboardItem {
  op: 'copy' | 'cut';
  path: string;
  name: string;
  isDir: boolean;
}

interface CommandCenterAction {
  id: string;
  label: string;
  command: string;
  args: string[];
  isConfigured: boolean;
  isRunning: boolean;
  processId?: string;
}

interface CommandCenterSummary {
  workspace: string;
  project: {
    name: string;
    ecosystems: string[];
    packageManager: string | null;
    framework: string | null;
    scripts: Record<string, string>;
    devCommand: string | null;
    buildCommand: string | null;
    testCommand: string | null;
    isMonorepo?: boolean;
    workspaces?: string[];
  };
  git: {
    isRepo: boolean;
    currentBranch: string;
    stagedCount: number;
    unstagedCount: number;
    untrackedCount: number;
    isClean: boolean;
  };
  processes: Array<{
    id: string;
    name: string;
    command: string;
    args: string[];
    pid: number | null;
    status: string;
    ports: number[];
    previewUrl: string | null;
  }>;
  previews: Array<{
    id: string;
    name: string;
    port: number;
    previewUrl: string;
    status: string;
  }>;
  actions: CommandCenterAction[];
}

function FileTreeNode({ 
  name, path, isDir, level, onSelectFile, expandedPaths, toggleExpand, onAction, onContextMenu, selectedPath, onSelectPath
}: { 
  name: string, path: string, isDir: boolean, level: number, 
  onSelectFile: (p: string) => void, 
  expandedPaths: Set<string>, toggleExpand: (p: string) => void,
  onContextMenu?: (e: React.MouseEvent | { preventDefault: () => void, stopPropagation: () => void, clientX: number, clientY: number }, path: string, isDir: boolean) => void,
  onAction: (e: React.MouseEvent, action: string, path: string) => void,
  selectedPath?: string | null,
  onSelectPath?: (p: string) => void
}) {
  const isExpanded = expandedPaths.has(path);
  const isSelected = selectedPath === path;
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreClickRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    timerRef.current = setTimeout(() => {
      if (onContextMenu) {
        if (navigator.vibrate) navigator.vibrate(50);
        onContextMenu({ preventDefault: () => {}, stopPropagation: () => {}, clientX: e.clientX, clientY: e.clientY }, path, isDir);
        timerRef.current = null;
        ignoreClickRef.current = true;
      }
    }, 600);
  };

  const handlePointerUpOrMove = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }
    onSelectPath?.(path);
    if (isDir) {
      toggleExpand(path);
    } else {
      onSelectFile(path);
    }
  };

  const fetchChildren = () => {
    if (isDir && isExpanded) {
      setLoading(true);
      apiJson<FileEntry[]>(`/api/files?p=${encodeURIComponent(path)}`)
        .then(data => {
          if (Array.isArray(data)) {
            const sorted = data.sort((a, b) => {
              if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
              return a.isDir ? -1 : 1;
            });
            setChildren(sorted);
          }
        })
        .catch(() => setChildren([]))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (isDir && isExpanded) {
      fetchChildren();
    }
  }, [isDir, isExpanded, path]);

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return <FileCode2 size={15} className="text-yellow-400" />;
    }
    if (fileName.endsWith('.json')) return <FileJson size={15} className="text-green-400" />;
    if (fileName.endsWith('.md')) return <FileText size={15} className="text-blue-300" />;
    return <File size={15} className="text-gray-400" />;
  };

  return (
    <div>
      <div 
        className={`flex items-center py-1 cursor-pointer group select-none [-webkit-touch-callout:none] transition-colors ${
          isSelected ? 'bg-[#37373d] text-white font-medium' : 'text-gray-300 hover:bg-[#2a2d2e]'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelectPath?.(path);
          if (onContextMenu) onContextMenu(e, path, isDir);
        }}
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
          {loading && children.length === 0 ? (
            <div className="text-xs text-gray-500 py-1" style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}>Loading...</div>
          ) : children.length === 0 ? (
            <div className="text-xs text-gray-500 py-1" style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}>Empty</div>
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
                selectedPath={selectedPath}
                onSelectPath={onSelectPath}
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
    
    setTimeout(() => fitAddon.fit(), 50);

    const wsUrl = `${WS_BASE_URL}/ws/terminal?termId=${encodeURIComponent(termId)}&cwd=${encodeURIComponent(workspace)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'terminal.resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal.output') term.write(msg.data);
      } catch {}
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
  const [unsavedModal, setUnsavedModal] = useState<{ filename: string, onSave: () => void, onDiscard: () => void, onCancel: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ type: 'folder' | 'file', targetDir: string, onSubmit: (name: string) => void } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ path: string, name: string, isDir: boolean } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string, isDir: boolean } | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number, y: number, path: string } | null>(null);
  const editorRef = useRef<any>(null);
  const splitEditorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Quick Open / Command Palette
  const [quickOpen, setQuickOpen] = useState(false);
  const [qoQuery, setQoQuery] = useState('');
  const [qoResults, setQoResults] = useState<string[]>([]);
  const [qoSelectedIndex, setQoSelectedIndex] = useState(0);
  const [renameModal, setRenameModal] = useState<{ path: string, initialName: string } | null>(null);

  const getInitialWorkspace = () => {
    if (!initialPath) return '/root';
    const parts = initialPath.split('/');
    if (parts.length > 1 && parts[parts.length - 1]?.includes('.')) {
      return parts.slice(0, -1).join('/') || '/';
    }
    return initialPath;
  };

  const [workspace, setWorkspace] = useState(() => safeStorage.getString(`nebucode_workspace_${winId}`, getInitialWorkspace()));
  
  useEffect(() => {
    safeStorage.setString(`nebucode_workspace_${winId}`, workspace);
  }, [workspace, winId]);

  // Recent Files (Workspace scoped)
  const [recentFiles, setRecentFiles] = useState<string[]>(() => {
    return safeStorage.getItem<string[]>(
      safeStorage.getWorkspaceKey(workspace, 'recent_files', winId),
      [],
      Array.isArray
    );
  });

  useEffect(() => {
    safeStorage.setItem(safeStorage.getWorkspaceKey(workspace, 'recent_files', winId), recentFiles);
  }, [recentFiles, workspace, winId]);

  // Clipboard State
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  // Selected Path in Tree
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Split Editor State (Workspace scoped)
  const [splitFile, setSplitFile] = useState<string | null>(() => {
    return safeStorage.getString(safeStorage.getWorkspaceKey(workspace, 'split_file', winId), '') || null;
  });
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>(() => {
    const savedOrient = safeStorage.getString(safeStorage.getWorkspaceKey(workspace, 'split_orient', winId), 'horizontal');
    return savedOrient === 'vertical' ? 'vertical' : 'horizontal';
  });

  useEffect(() => {
    safeStorage.setString(safeStorage.getWorkspaceKey(workspace, 'split_file', winId), splitFile || '');
    safeStorage.setString(safeStorage.getWorkspaceKey(workspace, 'split_orient', winId), splitOrientation);
  }, [splitFile, splitOrientation, workspace, winId]);

  // Workspace Search (Grep & Replace) State
  const [grepQuery, setGrepQuery] = useState('');
  const [grepReplace, setGrepReplace] = useState('');
  const [isGrepCaseSensitive, setIsGrepCaseSensitive] = useState(false);
  const [showReplaceInput, setShowReplaceInput] = useState(false);
  const [grepResults, setGrepResults] = useState<GrepMatch[]>([]);
  const [grepLoading, setGrepLoading] = useState(false);
  const [replaceConfirmModal, setReplaceConfirmModal] = useState<{ q: string, replaceWith: string, totalMatches: number, totalFiles: number, files: string[] } | null>(null);

  const [workspaceFiles, setWorkspaceFiles] = useState<FileEntry[]>([]);
  
  // Expanded paths (Workspace scoped)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const saved = safeStorage.getItem<string[]>(
      safeStorage.getWorkspaceKey(workspace, 'expanded', winId),
      [workspace],
      Array.isArray
    );
    return new Set(saved);
  });

  useEffect(() => {
    safeStorage.setItem(safeStorage.getWorkspaceKey(workspace, 'expanded', winId), Array.from(expandedPaths));
  }, [expandedPaths, workspace, winId]);

  // Editor State (Workspace scoped)
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  useEffect(() => {
    safeStorage.setString(safeStorage.getWorkspaceKey(workspace, 'active_file', winId), activeFile || '');
    safeStorage.setItem(safeStorage.getWorkspaceKey(workspace, 'open_files', winId), openFiles.map(f => f.path));
  }, [activeFile, openFiles, workspace, winId]);

  // Cursor & Scroll Position Map (Workspace scoped)
  const cursorMapRef = useRef<Record<string, { lineNumber: number; column: number; scrollTop?: number }>>({});

  useEffect(() => {
    cursorMapRef.current = safeStorage.getItem<Record<string, { lineNumber: number; column: number; scrollTop?: number }>>(
      safeStorage.getWorkspaceKey(workspace, 'cursor_positions', winId),
      {},
      (val): val is Record<string, { lineNumber: number; column: number; scrollTop?: number }> => typeof val === 'object' && val !== null && !Array.isArray(val)
    );
  }, [workspace, winId]);

  const saveCursorPosition = (filePath: string, line?: number, col?: number, scrollTop?: number) => {
    if (!filePath || filePath.startsWith('preview:')) return;
    const existing = cursorMapRef.current[filePath] || { lineNumber: 1, column: 1 };
    cursorMapRef.current[filePath] = {
      lineNumber: line ?? existing.lineNumber,
      column: col ?? existing.column,
      scrollTop: scrollTop ?? existing.scrollTop
    };
    safeStorage.setItem(safeStorage.getWorkspaceKey(workspace, 'cursor_positions', winId), cursorMapRef.current);
  };

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeActivity, setActiveActivity] = useState<string | null>(() => safeStorage.getString('nebucode_activity', 'explorer'));
  const [sidebarWidth, setSidebarWidth] = useState(() => Math.min(800, Math.max(150, Number(safeStorage.getString('nebucode_sidebar', '256')) || 256)));
  const [showBottomPanel, setShowBottomPanel] = useState(() => safeStorage.getString('nebucode_terminal_open', 'false') === 'true');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => Math.min(800, Math.max(100, Number(safeStorage.getString('nebucode_terminal_height', '250')) || 250)));

  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'ports' | 'problems'>('terminal');
  const [devServers, setDevServers] = useState<any[]>([]);
  const [problems, setProblems] = useState<DiagnosticItem[]>([]);
  const [problemsFilter, setProblemsFilter] = useState('');
  const [problemsSeverityFilter, setProblemsSeverityFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  
  // Ports scanner
  useEffect(() => {
    if (!showBottomPanel || bottomPanelTab !== 'ports') return;
    let mounted = true;
    
    const fetchServers = async () => {
      try {
        const data = await apiJson<{ servers?: any[] }>(`/api/dev-servers?workspace=${encodeURIComponent(workspace)}`);
        if (mounted) {
          setDevServers(data.servers || []);
        }
      } catch {}
    };
    
    fetchServers();
    const interval = setInterval(fetchServers, 3000);
    return () => { mounted = false; clearInterval(interval); };
  }, [showBottomPanel, bottomPanelTab, workspace]);

  // Terminal instances
  const [terminals, setTerminals] = useState<{ id: string, cwd: string, name?: string }[]>(() => {
    return safeStorage.getItem<{ id: string, cwd: string, name?: string }[]>(
      `nebucode_terminals_${winId}`,
      [{ id: '1', cwd: workspace, name: 'bash' }],
      (arr): arr is { id: string, cwd: string, name?: string }[] => Array.isArray(arr) && arr.length > 0
    );
  });
  const [activeTermId, setActiveTermId] = useState(() => safeStorage.getString(`nebucode_active_term_${winId}`, '1'));

  useEffect(() => { safeStorage.setItem(`nebucode_terminals_${winId}`, terminals); }, [terminals, winId]);
  useEffect(() => { safeStorage.setString(`nebucode_active_term_${winId}`, activeTermId); }, [activeTermId, winId]);

  const addTerminal = (cwd: string = workspace) => {
    const id = Date.now().toString();
    const folderName = cwd.split('/').filter(Boolean).pop() || 'bash';
    setTerminals(prev => [...prev, { id, cwd, name: folderName }]);
    setActiveTermId(id);
    setShowBottomPanel(true);
    setBottomPanelTab('terminal');
  };

  // Developer Command Center State
  const [ccSummary, setCcSummary] = useState<CommandCenterSummary | null>(null);
  const [ccLoading, setCcLoading] = useState(false);
  const [ccSelectedIdx, setCcSelectedIdx] = useState(0);
  const [ccRunningAction, setCcRunningAction] = useState<string | null>(null);

  const loadCommandCenter = async (silent = false) => {
    if (!silent) setCcLoading(true);
    try {
      const res = await apiFetch(`/api/command-center/summary?p=${encodeURIComponent(workspace)}`);
      if (res.ok) {
        const data = await res.json();
        setCcSummary(data);
      }
    } catch {} finally {
      if (!silent) setCcLoading(false);
    }
  };

  useEffect(() => {
    if (activeActivity === 'commandCenter') {
      loadCommandCenter();
      const timer = setInterval(() => loadCommandCenter(true), 4000);
      return () => clearInterval(timer);
    }
  }, [activeActivity, workspace]);

  const handleRunCommandCenterAction = async (actionId: string) => {
    setCcRunningAction(actionId);
    try {
      const res = await apiFetch('/api/command-center/run-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace, actionId })
      });
      if (res.ok) {
        await loadCommandCenter(true);
      }
    } catch {} finally {
      setCcRunningAction(null);
    }
  };

  const handleStopCommandCenterAction = async (processId: string) => {
    try {
      const res = await apiFetch('/api/command-center/stop-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId })
      });
      if (res.ok) {
        await loadCommandCenter(true);
      }
    } catch {}
  };

  const killTerminal = async (id: string) => {
    try {
      const fullTermId = `${winId}_integrated_${id}`;
      await apiFetch(`/api/terminal/${fullTermId}`, { method: 'DELETE' });
    } catch {}
    
    setTerminals(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) setShowBottomPanel(false);
      return next;
    });
    if (activeTermId === id) {
      const remaining = terminals.filter(t => t.id !== id);
      if (remaining.length > 0) setActiveTermId(remaining[remaining.length - 1]!.id);
    }
  };

  useEffect(() => { localStorage.setItem('nebucode_activity', activeActivity || ''); }, [activeActivity]);
  useEffect(() => { localStorage.setItem('nebucode_sidebar', sidebarWidth.toString()); }, [sidebarWidth]);
  useEffect(() => { localStorage.setItem('nebucode_terminal_open', showBottomPanel.toString()); }, [showBottomPanel]);
  useEffect(() => { localStorage.setItem('nebucode_terminal_height', bottomPanelHeight.toString()); }, [bottomPanelHeight]);

  interface GitStatusData {
    isRepo: boolean;
    notRepo?: boolean;
    branch: string;
    branches: string[];
    files: Array<{ status: string; file: string }>;
    staged: Array<{ file: string; status: string }>;
    unstaged: Array<{ file: string; status: string }>;
    untracked: Array<{ file: string; status: string }>;
    clean: boolean;
  }

  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [gitCommitMsg, setGitCommitMsg] = useState('');
  const [gitLoading, setGitLoading] = useState(false);
  const [diffModal, setDiffModal] = useState<{ file: string; diff: string; staged: boolean } | null>(null);

  const refreshGitStatus = async () => {
    setGitLoading(true);
    try {
      const data = await apiJson<GitStatusData>(`/api/git/status?p=${encodeURIComponent(workspace)}`);
      if (data.notRepo || !data.isRepo) {
        setGitStatus(null);
      } else {
        setGitStatus(data);
      }
    } catch {
      setGitStatus(null);
    } finally {
      setGitLoading(false);
    }
  };

  useEffect(() => {
    if (activeActivity === 'git') {
      refreshGitStatus();
    }
  }, [activeActivity, workspace]);

  const handleGitStage = async (file?: string, all?: boolean) => {
    try {
      await apiFetch('/api/git/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace, file, all })
      });
      await refreshGitStatus();
    } catch (e: any) {
      setStatus(`Stage failed: ${e.message}`);
    }
  };

  const handleGitUnstage = async (file?: string, all?: boolean) => {
    try {
      await apiFetch('/api/git/unstage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace, file, all })
      });
      await refreshGitStatus();
    } catch (e: any) {
      setStatus(`Unstage failed: ${e.message}`);
    }
  };

  const handleGitDiscard = async (file: string, untracked?: boolean) => {
    if (!confirm(`Discard changes in "${file}"? This action cannot be undone.`)) return;
    try {
      await apiFetch('/api/git/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace, file, untracked })
      });
      if (diffModal?.file === file) setDiffModal(null);
      await refreshGitStatus();
    } catch (e: any) {
      setStatus(`Discard failed: ${e.message}`);
    }
  };

  const handleGitCommit = async () => {
    if (!gitCommitMsg.trim()) return;
    setGitLoading(true);
    try {
      const res = await apiFetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace, message: gitCommitMsg.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Commit failed: ${err.error || res.statusText}`);
      } else {
        setGitCommitMsg('');
        setStatus('Changes committed successfully');
        await refreshGitStatus();
      }
    } catch (e: any) {
      alert(`Commit error: ${e.message}`);
    } finally {
      setGitLoading(false);
    }
  };

  const handleGitDiff = async (file: string, staged: boolean) => {
    try {
      const data = await apiJson<{ diff: string }>(
        `/api/git/diff?p=${encodeURIComponent(workspace)}&file=${encodeURIComponent(file)}&staged=${staged}`
      );
      setDiffModal({ file, diff: data.diff || '', staged });
    } catch (e: any) {
      setStatus(`Diff error: ${e.message}`);
    }
  };

  const handleGitCheckout = async (branchName: string, create?: boolean) => {
    if (create) {
      const name = prompt('Enter new branch name:');
      if (!name || !name.trim()) return;
      branchName = name.trim();
    }
    setGitLoading(true);
    try {
      const res = await apiFetch('/api/git/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace, branch: branchName, create })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Checkout failed: ${err.error || res.statusText}`);
      } else {
        setStatus(`Switched to branch: ${branchName}`);
        await refreshGitStatus();
      }
    } catch (e: any) {
      alert(`Checkout error: ${e.message}`);
    } finally {
      setGitLoading(false);
    }
  };

  const handleGitSync = async (action: 'fetch' | 'pull' | 'push') => {
    setGitLoading(true);
    setStatus(`Git ${action}ing...`);
    try {
      const res = await apiFetch(`/api/git/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Git ${action} failed: ${data.error || res.statusText}`);
      } else {
        setStatus(`Git ${action} completed`);
      }
      await refreshGitStatus();
    } catch (e: any) {
      alert(`Git ${action} error: ${e.message}`);
    } finally {
      setGitLoading(false);
    }
  };

  const handleGitInit = async () => {
    setGitLoading(true);
    try {
      await apiFetch('/api/git/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace })
      });
      setStatus('Git repository initialized');
      await refreshGitStatus();
    } catch (e: any) {
      alert(`Git init error: ${e.message}`);
    } finally {
      setGitLoading(false);
    }
  };

  const handleGrepSearch = async () => {
    if (grepQuery.trim().length < 2) return;
    setGrepLoading(true);
    setStatus('Searching workspace...');
    try {
      const data = await apiJson<{ results?: GrepMatch[] }>(
        `/api/files/grep?p=${encodeURIComponent(workspace)}&q=${encodeURIComponent(grepQuery.trim())}&caseSensitive=${isGrepCaseSensitive}`
      );
      const results = data.results || [];
      setGrepResults(results);
      const fileCount = new Set(results.map(r => r.file)).size;
      setStatus(`Found ${results.length} match(es) across ${fileCount} file(s)`);
      setTimeout(() => setStatus(''), 2500);
    } catch (e: any) {
      const message = e instanceof Error ? e.message : String(e);
      setStatus(`Search error: ${message}`);
    } finally {
      setGrepLoading(false);
    }
  };

  const executeReplaceAll = async () => {
    if (!replaceConfirmModal) return;
    const { q, replaceWith, files } = replaceConfirmModal;
    setReplaceConfirmModal(null);
    setStatus('Replacing in files...');
    try {
      const res = await apiFetch('/api/files/replace-in-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: workspace, q, replaceWith, files })
      });
      if (!res.ok) throw new Error('Replace failed');
      const data = await res.json();
      
      // Update any open files that were modified
      for (const rel of data.filesModified || []) {
        const full = workspace === '/' ? `/${rel}` : `${workspace}/${rel}`;
        const openIdx = openFiles.findIndex(f => f.path === full);
        if (openIdx !== -1) {
          const contentRes = await apiFetch(`/api/files/content?p=${encodeURIComponent(full)}`);
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            setOpenFiles(prev => prev.map(f => f.path === full ? { ...f, content: contentData.content, original: contentData.content, isDirty: false } : f));
          }
        }
      }

      setStatus(`Replaced ${data.count} occurrence(s) in ${data.filesModified?.length || 0} file(s)`);
      handleGrepSearch();
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      const message = e instanceof Error ? e.message : String(e);
      setStatus(`Replace error: ${message}`);
    }
  };

  const groupedGrepResults = grepResults.reduce<Record<string, GrepMatch[]>>((acc, match) => {
    if (!acc[match.file]) acc[match.file] = [];
    acc[match.file]!.push(match);
    return acc;
  }, {});

  // Folder picking listeners
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail?.winId === winId) {
        document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
          detail: {
            initialPath: workspace,
            onSelect: (p: string) => {
              setWorkspace(p);
              setExpandedPaths(new Set([p]));
              setOpenFiles([]);
              setActiveFile(null);
              setSplitFile(null);
            }
          }
        }));
      }
    };
    const directHandler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail?.winId === winId && ce.detail.path) {
        setWorkspace(ce.detail.path);
        setExpandedPaths(new Set([ce.detail.path]));
        setOpenFiles([]);
        setActiveFile(null);
        setSplitFile(null);
      }
    };
    document.addEventListener('nebucode:open-folder', handler);
    document.addEventListener('nebucode:open-folder-direct', directHandler);
    return () => {
      document.removeEventListener('nebucode:open-folder', handler);
      document.removeEventListener('nebucode:open-folder-direct', directHandler);
    };
  }, [winId, workspace]);

  // Restore open files from safeStorage (Workspace scoped)
  useEffect(() => {
    let mounted = true;
    const restoreFiles = async () => {
      try {
        const savedActive = safeStorage.getString(safeStorage.getWorkspaceKey(workspace, 'active_file', winId), '');
        const rawPaths = safeStorage.getItem<string[]>(
          safeStorage.getWorkspaceKey(workspace, 'open_files', winId),
          [],
          Array.isArray
        );
        
        if (!rawPaths || rawPaths.length === 0) {
          if (mounted) {
            setOpenFiles([]);
            setActiveFile(null);
          }
          return;
        }
        
        const paths = rawPaths.filter((p): p is string => typeof p === 'string').slice(0, 50);
        if (paths.length === 0) {
          if (mounted) {
            setOpenFiles([]);
            setActiveFile(null);
          }
          return;
        }
        
        const newOpenFiles: OpenFile[] = [];
        
        for (const p of paths) {
          if (typeof p !== 'string') continue;
          if (p.startsWith('preview:')) {
            newOpenFiles.push({ path: p, content: '', original: '', isDirty: false });
            continue;
          }
          const res = await apiFetch(`/api/files/content?p=${encodeURIComponent(p)}`);
          if (res.ok) {
            const data = await res.json();
            newOpenFiles.push({ path: p, content: data.content, original: data.content, isDirty: false });
          }
        }
        if (mounted) {
          setOpenFiles(newOpenFiles);
          if (savedActive && newOpenFiles.some(f => f.path === savedActive)) {
            setActiveFile(savedActive);
          } else {
            setActiveFile(newOpenFiles[0]?.path || null);
          }
        }
      } catch {}
    };
    restoreFiles();
    return () => { mounted = false; };
  }, [workspace, winId]);

  // Load root workspace
  const loadWorkspace = async () => {
    try {
      const data = await apiJson<FileEntry[]>(`/api/files?p=${encodeURIComponent(workspace)}`);
      if (Array.isArray(data)) {
        const sorted = data.sort((a, b) => {
          if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
          return a.isDir ? -1 : 1;
        });
        setWorkspaceFiles(sorted);
      }
    } catch {}
  };

  useEffect(() => {
    loadWorkspace();
  }, [workspace]);

  // Auto-open initialPath if passed
  useEffect(() => {
    if (initialPath) {
      openFile(initialPath);
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

  const openFile = async (path: string, line?: number, col?: number) => {
    setSelectedPath(path);
    if (!path.startsWith('preview:')) {
      setRecentFiles(prev => [path, ...prev.filter(p => p !== path)].slice(0, 30));
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 1) {
        setExpandedPaths(prev => {
          const next = new Set(prev);
          let acc = '';
          for (let i = 0; i < parts.length - 1; i++) {
            acc += '/' + parts[i];
            next.add(acc);
          }
          return next;
        });
      }
    }

    const jumpToLine = () => {
      if (line !== undefined && editorRef.current) {
        setTimeout(() => {
          try {
            editorRef.current.revealLineInCenter(line);
            editorRef.current.setPosition({ lineNumber: line, column: col || 1 });
            editorRef.current.focus();
          } catch {}
        }, 60);
      }
    };

    if (openFiles.find(f => f.path === path)) {
      setActiveFile(path);
      jumpToLine();
      return;
    }
    
    setLoading(true);
    try {
      const res = await apiFetch(`/api/files/content?p=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      
      setOpenFiles(prev => [...prev, { path, content: data.content, original: data.content, isDirty: false }]);
      setActiveFile(path);
      jumpToLine();
    } catch (e: any) {
      const message = e instanceof Error ? e.message : String(e);
      setStatus(`Error: ${message}`);
      setTimeout(() => setStatus(''), 3000);
    }
    setLoading(false);
  };

  const openToSide = async (path: string) => {
    await openFile(path);
    setSplitFile(path);
  };

  const closeFile = (e: React.MouseEvent | null, path: string) => {
    if (e) e.stopPropagation();
    
    const closingIdx = openFiles.findIndex(f => f.path === path);
    if (closingIdx === -1) return;
    
    const file = openFiles[closingIdx]!;
    
    const doClose = () => {
      setOpenFiles(prev => prev.filter(f => f.path !== path));
      if (activeFile === path) {
        const nextFiles = openFiles.filter(f => f.path !== path);
        if (nextFiles.length > 0) {
          const nextIdx = closingIdx >= nextFiles.length ? nextFiles.length - 1 : closingIdx;
          setActiveFile(nextFiles[nextIdx]?.path || null);
        } else {
          setActiveFile(null);
        }
      }
      if (splitFile === path) {
        setSplitFile(null);
      }
    };
    
    if (file.isDirty) {
      setUnsavedModal({
        filename: path.split('/').pop() || '',
        onSave: async () => {
          await saveFile(path);
          setUnsavedModal(null);
          doClose();
        },
        onDiscard: () => {
          setUnsavedModal(null);
          doClose();
        },
        onCancel: () => setUnsavedModal(null)
      });
      return;
    }
    
    doClose();
  };

  const closeOthers = (keepPath: string) => {
    const dirtyToPrompt = openFiles.filter(f => f.path !== keepPath && f.isDirty);
    if (dirtyToPrompt.length > 0) {
      if (!confirm(`You have ${dirtyToPrompt.length} unsaved file(s). Discard changes and close others?`)) return;
    }
    setOpenFiles(prev => prev.filter(f => f.path === keepPath));
    setActiveFile(keepPath);
    if (splitFile && splitFile !== keepPath) setSplitFile(null);
  };

  const closeSaved = () => {
    setOpenFiles(prev => {
      const remaining = prev.filter(f => f.isDirty);
      if (activeFile && !remaining.some(f => f.path === activeFile)) {
        setActiveFile(remaining[0]?.path || null);
      }
      if (splitFile && !remaining.some(f => f.path === splitFile)) {
        setSplitFile(null);
      }
      return remaining;
    });
  };

  const closeAll = () => {
    const dirtyFiles = openFiles.filter(f => f.isDirty);
    if (dirtyFiles.length > 0) {
      if (!confirm(`You have ${dirtyFiles.length} unsaved file(s). Discard changes and close all?`)) return;
    }
    setOpenFiles([]);
    setActiveFile(null);
    setSplitFile(null);
  };

  const closeToTheRight = (refPath: string) => {
    const idx = openFiles.findIndex(f => f.path === refPath);
    if (idx === -1) return;
    const rightFiles = openFiles.slice(idx + 1);
    for (const f of rightFiles) {
      closeFile(null, f.path);
    }
  };
  const closeTabsToRight = closeToTheRight;

  const saveFile = async (path: string) => {
    const file = openFiles.find(f => f.path === path);
    if (!file || !file.isDirty) return;
    
    setStatus(`Saving ${path.split('/').pop()}...`);
    try {
      const res = await apiFetch(`/api/files/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const saveAll = async () => {
    const dirtyFiles = openFiles.filter(f => f.isDirty);
    for (const f of dirtyFiles) {
      await saveFile(f.path);
    }
  };

  // Auto-save debounce (1.5s)
  useEffect(() => {
    const dirtyFiles = openFiles.filter(f => f.isDirty);
    if (dirtyFiles.length === 0) return;
    const timer = setTimeout(() => {
      dirtyFiles.forEach(f => saveFile(f.path));
    }, 1500);
    return () => clearTimeout(timer);
  }, [openFiles]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      setQuickOpen(true);
      setQoQuery('');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      setQuickOpen(true);
      setQoQuery('>');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
      if (activeFile) closeFile(null, activeFile);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
      setShowBottomPanel(prev => !prev);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM, () => {
      setShowBottomPanel(true);
      setBottomPanelTab('problems');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      setActiveActivity(prev => prev ? null : 'explorer');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backslash, () => {
      if (activeFile) {
        setSplitFile(prev => prev ? null : activeFile);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      setActiveActivity('search');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE, () => {
      setActiveActivity('explorer');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC, () => {
      setActiveActivity(prev => prev === 'commandCenter' ? null : 'commandCenter');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG, () => {
      setActiveActivity('git');
    });

    editor.onDidChangeCursorPosition((e: any) => {
      if (activeFile && e?.position) {
        saveCursorPosition(activeFile, e.position.lineNumber, e.position.column);
      }
    });

    editor.onDidScrollChange((e: any) => {
      if (activeFile && e?.scrollTop !== undefined) {
        saveCursorPosition(activeFile, undefined, undefined, e.scrollTop);
      }
    });
  };

  const runDiagnostics = async (tool: string = 'auto') => {
    setIsRunningDiagnostics(true);
    setStatus('Running diagnostics...');
    try {
      const res = await apiFetch('/api/diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, tool })
      });
      if (res.ok) {
        const data = await res.json();
        setProblems(data.diagnostics || []);
        setStatus(`Diagnostics complete: ${data.summary?.errors || 0} errors, ${data.summary?.warnings || 0} warnings`);
        if (data.diagnostics && data.diagnostics.length > 0) {
          setShowBottomPanel(true);
          setBottomPanelTab('problems');
        }
      } else {
        const err = await res.json();
        setStatus(`Diagnostics failed: ${err.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setStatus(`Diagnostics error: ${e.message}`);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const clearProblems = () => {
    setProblems([]);
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelMarkers(model, 'diagnostics', []);
      }
    }
  };

  const jumpToProblem = async (p: DiagnosticItem) => {
    let targetPath = p.file;
    if (!targetPath.startsWith('/')) {
      targetPath = `${workspace.replace(/\/+$/, '')}/${targetPath}`;
    }
    
    // Check if open
    const isAlreadyOpen = openFiles.some(f => f.path === targetPath);
    if (!isAlreadyOpen) {
      const res = await apiFetch(`/api/files/content?p=${encodeURIComponent(targetPath)}`);
      if (res.ok) {
        const data = await res.json();
        setOpenFiles(prev => [...prev, { path: targetPath, content: data.content, original: data.content, isDirty: false }]);
      }
    }
    setActiveFile(targetPath);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealPositionInCenter({ lineNumber: p.line, column: p.column });
        editorRef.current.setPosition({ lineNumber: p.line, column: p.column });
        editorRef.current.focus();
      }
    }, 100);
  };

  // Synchronize Monaco markers with active file problems
  useEffect(() => {
    if (!monacoRef.current || !editorRef.current || !activeFile) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const normActive = activeFile.replace(/\\/g, '/');
    const fileProblems = problems.filter(p => {
      const normP = p.file.replace(/\\/g, '/');
      return normActive.endsWith(normP) || normP.endsWith(normActive);
    });

    const markers = fileProblems.map(p => ({
      severity: p.severity === 'error' 
        ? monacoRef.current.MarkerSeverity.Error 
        : (p.severity === 'warning' ? monacoRef.current.MarkerSeverity.Warning : monacoRef.current.MarkerSeverity.Info),
      message: p.message,
      startLineNumber: p.line,
      startColumn: p.column,
      endLineNumber: p.line,
      endColumn: p.column + 5,
      source: p.source || 'diagnostics',
      code: p.code
    }));

    monacoRef.current.editor.setModelMarkers(model, 'diagnostics', markers);
  }, [problems, activeFile]);

  useEffect(() => {
    if (!editorRef.current || !activeFile) return;
    const pos = cursorMapRef.current[activeFile];
    if (pos && pos.lineNumber) {
      try {
        editorRef.current.setPosition({ lineNumber: pos.lineNumber, column: pos.column || 1 });
        if (pos.scrollTop !== undefined) {
          editorRef.current.setScrollTop(pos.scrollTop);
        }
        editorRef.current.revealPositionInCenterIfOutsideViewport({ lineNumber: pos.lineNumber, column: pos.column || 1 });
      } catch {}
    }
  }, [activeFile]);

  const handleEditorChange = (value: string | undefined, path: string | null) => {
    if (!path) return;
    const val = value ?? '';
    setOpenFiles(prev => prev.map(f => {
      if (f.path !== path) return f;
      return {
        ...f,
        content: val,
        isDirty: val !== f.original
      };
    }));
  };

  // Clipboard Actions
  const handleCopy = (path: string, isDir: boolean) => {
    const name = path.split('/').pop() || path;
    setClipboard({ op: 'copy', path, name, isDir });
    setStatus(`Copied "${name}" to clipboard`);
    setTimeout(() => setStatus(''), 2000);
  };

  const handleCut = (path: string, isDir: boolean) => {
    const name = path.split('/').pop() || path;
    setClipboard({ op: 'cut', path, name, isDir });
    setStatus(`Cut "${name}"`);
    setTimeout(() => setStatus(''), 2000);
  };

  const handlePaste = async (targetDir: string) => {
    if (!clipboard) return;

    if (clipboard.isDir && (targetDir === clipboard.path || targetDir.startsWith(clipboard.path + '/'))) {
      setStatus('Error: Cannot paste folder into itself or its subfolder');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    let destName = clipboard.name;
    let destPath = targetDir === '/' ? `/${destName}` : `${targetDir}/${destName}`;

    if (destPath === clipboard.path) {
      const parts = destName.split('.');
      if (parts.length > 1 && !clipboard.isDir) {
        const ext = parts.pop();
        destName = `${parts.join('.')} copy.${ext}`;
      } else {
        destName = `${destName} copy`;
      }
      destPath = targetDir === '/' ? `/${destName}` : `${targetDir}/${destName}`;
    }

    try {
      if (clipboard.op === 'copy') {
        const res = await apiFetch('/api/files/copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src: clipboard.path, dest: destPath })
        });
        if (!res.ok) throw new Error('Copy failed');
        setStatus(`Pasted "${destName}"`);
      } else if (clipboard.op === 'cut') {
        const res = await apiFetch('/api/files/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath: clipboard.path, newPath: destPath })
        });
        if (!res.ok) throw new Error('Move failed');
        
        // Update open tabs
        setOpenFiles(prev => prev.map(f => {
          if (f.path === clipboard.path) return { ...f, path: destPath };
          if (f.path.startsWith(clipboard.path + '/')) {
            return { ...f, path: destPath + f.path.slice(clipboard.path.length) };
          }
          return f;
        }));
        if (activeFile === clipboard.path) setActiveFile(destPath);
        if (splitFile === clipboard.path) setSplitFile(destPath);
        
        setClipboard(null);
        setStatus(`Moved "${destName}"`);
      }

      loadWorkspace();
      const newExpanded = new Set(expandedPaths);
      newExpanded.add(targetDir);
      setExpandedPaths(newExpanded);
      setTimeout(() => setStatus(''), 2000);
    } catch (e: any) {
      setStatus(`Paste failed: ${e.message}`);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleDuplicate = async (path: string, isDir: boolean) => {
    const name = path.split('/').pop() || '';
    const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';
    
    let dupName = '';
    const parts = name.split('.');
    if (parts.length > 1 && !isDir) {
      const ext = parts.pop();
      dupName = `${parts.join('.')} copy.${ext}`;
    } else {
      dupName = `${name} copy`;
    }
    const destPath = parentDir === '/' ? `/${dupName}` : `${parentDir}/${dupName}`;

    try {
      const res = await apiFetch('/api/files/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: path, dest: destPath })
      });
      if (!res.ok) throw new Error('Duplicate failed');
      loadWorkspace();
      setStatus(`Duplicated "${name}"`);
      setTimeout(() => setStatus(''), 2000);
    } catch (e: any) {
      setStatus(`Duplicate failed: ${e.message}`);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const copyPath = (p: string) => {
    navigator.clipboard.writeText(p);
    setStatus('Path copied to clipboard');
    setTimeout(() => setStatus(''), 2000);
  };

  const copyRelativePath = (p: string) => {
    const rel = p.startsWith(workspace) ? p.slice(workspace.length).replace(/^\//, '') : p;
    navigator.clipboard.writeText(rel);
    setStatus('Relative path copied');
    setTimeout(() => setStatus(''), 2000);
  };

  // Keyboard Shortcuts Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isCmd = e.ctrlKey || e.metaKey;

    if (isCmd && e.key === 's') {
      e.preventDefault();
      if (e.shiftKey) {
        saveAll();
      } else if (activeFile) {
        saveFile(activeFile);
      }
      return;
    }

    if (isCmd && e.key === 'w') {
      e.preventDefault();
      if (activeFile) closeFile(null, activeFile);
      return;
    }

    if (isCmd && e.key === 'b') {
      e.preventDefault();
      setActiveActivity(prev => prev ? null : 'explorer');
      return;
    }

    if (isCmd && e.key === '`') {
      e.preventDefault();
      setShowBottomPanel(prev => !prev);
      return;
    }

    if (isCmd && e.key === '\\') {
      e.preventDefault();
      if (activeFile) {
        setSplitFile(prev => prev ? null : activeFile);
      }
      return;
    }

    if (isCmd && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setActiveActivity('search');
      return;
    }

    if (isCmd && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      setActiveActivity('explorer');
      return;
    }

    if (isCmd && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      setQuickOpen(true);
      setQoQuery('>');
      setQoSelectedIndex(0);
      return;
    }

    if (isCmd && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      setQuickOpen(true);
      setQoQuery('');
      setQoSelectedIndex(0);
      return;
    }

    if (e.key === 'F2' && selectedPath) {
      e.preventDefault();
      const name = selectedPath.split('/').pop() || '';
      setRenameModal({ path: selectedPath, initialName: name });
      return;
    }

    if (e.key === 'Delete' && selectedPath) {
      e.preventDefault();
      const name = selectedPath.split('/').pop() || '';
      const isDir = !name.includes('.');
      setDeleteModal({ path: selectedPath, name, isDir });
      return;
    }

    if (isCmd && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      setActiveActivity(prev => prev === 'commandCenter' ? null : 'commandCenter');
      return;
    }

    if (isCmd && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      setActiveActivity('git');
      return;
    }

    if (isCmd && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      setShowBottomPanel(true);
      setBottomPanelTab('problems');
      return;
    }

    if (activeActivity === 'commandCenter' && ccSummary?.actions?.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCcSelectedIdx(prev => (prev + 1) % ccSummary.actions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCcSelectedIdx(prev => (prev - 1 + ccSummary.actions.length) % ccSummary.actions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedAction = ccSummary.actions[ccSelectedIdx];
        if (selectedAction) {
          if (selectedAction.isRunning && selectedAction.processId) {
            handleStopCommandCenterAction(selectedAction.processId);
          } else {
            handleRunCommandCenterAction(selectedAction.id);
          }
        }
        return;
      }
    }
  };

  // Search logic for Quick Open
  useEffect(() => {
    if (!quickOpen) {
      setQoResults([]);
      setQoSelectedIndex(0);
      return;
    }
    if (qoQuery.startsWith('>')) {
      setQoResults([]);
      setQoSelectedIndex(0);
      return;
    }
    if (qoQuery.length < 1) {
      // Empty query shows recent files
      const recents = recentFiles.filter(p => !p.startsWith('preview:')).map(p => {
        return p.startsWith(workspace) ? p.slice(workspace.length).replace(/^\//, '') : p;
      });
      setQoResults(recents);
      setQoSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await apiJson<{ results?: string[] }>(`/api/files/search?p=${encodeURIComponent(workspace)}&q=${encodeURIComponent(qoQuery)}`);
        const list = Array.isArray(data) ? data : data.results || [];
        const qLower = qoQuery.toLowerCase();
        const sorted = [...list].sort((a, b) => {
          const aName = a.split('/').pop()?.toLowerCase() || '';
          const bName = b.split('/').pop()?.toLowerCase() || '';
          if (aName === qLower && bName !== qLower) return -1;
          if (bName === qLower && aName !== qLower) return 1;
          if (aName.startsWith(qLower) && !bName.startsWith(qLower)) return -1;
          if (bName.startsWith(qLower) && !aName.startsWith(qLower)) return 1;
          return aName.localeCompare(bName);
        });
        setQoResults(sorted);
        setQoSelectedIndex(0);
      } catch {}
    }, 120);
    return () => clearTimeout(timer);
  }, [quickOpen, qoQuery, workspace, recentFiles]);

  const handleAction = async (e: React.MouseEvent, action: string, targetPath: string) => {
    e.stopPropagation();
    if (action === 'rename') {
      const name = targetPath.split('/').pop() || '';
      setRenameModal({ path: targetPath, initialName: name });
      return;
    }
    if (action === 'delete') {
      const name = targetPath.split('/').pop() || '';
      const isDir = !name.includes('.');
      setDeleteModal({ path: targetPath, name, isDir });
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent | { preventDefault: () => void, stopPropagation: () => void, clientX: number, clientY: number },
    targetPath: string,
    isDir: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const clampedX = Math.min(e.clientX, window.innerWidth - 220);
    const clampedY = Math.min(e.clientY, window.innerHeight - 380);
    setContextMenu({ x: clampedX, y: clampedY, path: targetPath, isDir });
    setTabContextMenu(null);
  };

  const handleTabContextMenu = (e: React.MouseEvent, tabPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const clampedX = Math.min(e.clientX, window.innerWidth - 220);
    const clampedY = Math.min(e.clientY, window.innerHeight - 300);
    setTabContextMenu({ x: clampedX, y: clampedY, path: tabPath });
    setContextMenu(null);
  };

  const activeFileData = openFiles.find(f => f.path === activeFile);

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

  // Commands for Palette
  const commands = [
    { id: 'new-file', title: 'File: New File', icon: <FilePlus size={14} />, run: () => setPromptModal({ type: 'file', targetDir: workspace, onSubmit: async (name) => {
      await apiFetch('/api/files/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: workspace, name }) });
      loadWorkspace();
      openFile(workspace === '/' ? `/${name}` : `${workspace}/${name}`);
    }}) },
    { id: 'new-folder', title: 'File: New Folder', icon: <FolderPlus size={14} />, run: () => setPromptModal({ type: 'folder', targetDir: workspace, onSubmit: async (name) => {
      await apiFetch('/api/files/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: workspace, name }) });
      loadWorkspace();
    }}) },
    { id: 'save-file', title: 'File: Save Active File', icon: <File size={14} />, run: () => activeFile && saveFile(activeFile) },
    { id: 'save-all', title: 'File: Save All Files', icon: <FileText size={14} />, run: () => saveAll() },
    { id: 'close-editor', title: 'File: Close Active Editor', icon: <X size={14} />, run: () => activeFile && closeFile(null, activeFile) },
    { id: 'close-all', title: 'File: Close All Editors', icon: <Trash2 size={14} />, run: () => closeAll() },
    { id: 'toggle-sidebar', title: 'View: Toggle Primary Side Bar', icon: <LayoutPanelLeft size={14} />, run: () => setActiveActivity(prev => prev ? null : 'explorer') },
    { id: 'toggle-terminal', title: 'View: Toggle Integrated Terminal', icon: <TerminalSquare size={14} />, run: () => setShowBottomPanel(prev => !prev) },
    { id: 'split-right', title: 'View: Split Editor Right', icon: <Columns size={14} />, run: () => { if (activeFile) { setSplitFile(activeFile); setSplitOrientation('horizontal'); } } },
    { id: 'split-down', title: 'View: Split Editor Down', icon: <Columns size={14} />, run: () => { if (activeFile) { setSplitFile(activeFile); setSplitOrientation('vertical'); } } },
    { id: 'ports-preview', title: 'View: Toggle Ports & Preview', icon: <Play size={14} />, run: () => { setShowBottomPanel(true); setBottomPanelTab('ports'); } },
    { id: 'refresh', title: 'Explorer: Refresh Workspace', icon: <RefreshCw size={14} />, run: () => loadWorkspace() },
    { id: 'new-terminal', title: 'Terminal: Create New Terminal', icon: <Plus size={14} />, run: () => addTerminal(workspace) },
    { id: 'command-center', title: 'View: Developer Command Center', icon: <Activity size={14} />, run: () => setActiveActivity('commandCenter') },
    { id: 'git-panel', title: 'View: Source Control / Git', icon: <GitBranch size={14} />, run: () => setActiveActivity('git') },
    { id: 'run-dev', title: 'Project: Run Dev Server', icon: <Play size={14} />, run: () => handleRunCommandCenterAction('dev') },
    { id: 'run-build', title: 'Project: Build Project', icon: <Hammer size={14} />, run: () => handleRunCommandCenterAction('build') },
    { id: 'run-test', title: 'Project: Run Tests', icon: <CheckCircle2 size={14} />, run: () => handleRunCommandCenterAction('test') },
    { id: 'run-lint', title: 'Project: Run Linter', icon: <Check size={14} />, run: () => handleRunCommandCenterAction('lint') }
  ];

  const filteredCommands = commands.filter(c => 
    c.title.toLowerCase().includes(qoQuery.slice(1).trim().toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none outline-none" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Titlebar */}
      <div className="h-14 bg-[#333333] border-b border-[#252526] flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        
        {/* Search / Command Bar in Titlebar */}
        <div className="flex-1 flex justify-center">
           <div 
             className="nebudesk-no-drag bg-[#2d2d2d] text-gray-400 text-xs px-20 py-1.5 rounded flex items-center border border-[#3e3e42] shadow-inner cursor-pointer hover:bg-[#383838] hover:text-gray-200 transition-colors"
             onClick={() => { setQuickOpen(true); setQoQuery(''); }}
             title="Search files or commands (Ctrl+P)"
           >
             <Search size={14} className="mr-2" />
             <span>{workspace.split('/').filter(Boolean).pop() || 'NebuCode'}</span>
             <span className="ml-3 text-[10px] bg-[#3e3e42] px-1.5 py-0.5 rounded text-gray-300">Ctrl+P</span>
           </div>
        </div>
        
        <div className="w-[90px] shrink-0"></div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 space-y-4 shrink-0 border-r border-[#252526]">
          <button 
            onClick={() => setActiveActivity(prev => prev === 'explorer' ? null : 'explorer')}
            className={`p-2 rounded-md transition-colors ${activeActivity === 'explorer' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
            title="Explorer (Ctrl+B)"
          >
            <LayoutPanelLeft size={24} strokeWidth={1.5} />
          </button>
          <button 
            onClick={() => setActiveActivity(prev => prev === 'search' ? null : 'search')}
            className={`p-2 rounded-md transition-colors ${activeActivity === 'search' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
            title="Search in Files"
          >
            <Search size={24} strokeWidth={1.5} />
          </button>
          <button 
            onClick={() => setActiveActivity(prev => prev === 'git' ? null : 'git')}
            className={`p-2 rounded-md transition-colors ${activeActivity === 'git' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
            title="Source Control"
          >
            <GitBranch size={24} strokeWidth={1.5} />
          </button>
          <button 
            onClick={() => setActiveActivity(prev => prev === 'commandCenter' ? null : 'commandCenter')}
            className={`p-2 rounded-md transition-colors ${activeActivity === 'commandCenter' ? 'text-white border-l-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}
            title="Developer Command Center (Ctrl+Shift+C)"
          >
            <Activity size={24} strokeWidth={1.5} />
          </button>
          <div className="flex-1"></div>
          <button className="p-2 text-gray-400 hover:text-gray-200" title="Settings">
            <Settings size={24} strokeWidth={1.5} />
          </button>
        </div>

        {activeActivity && (
          <>
            {/* Sidebar */}
            <div style={{ width: sidebarWidth }} className="bg-[#252526] flex flex-col shrink-0 border-r border-[#1e1e1e] relative">
              <div className="h-9 px-4 flex items-center justify-between text-xs font-semibold tracking-wider text-gray-300 border-b border-[#2d2d2d]">
                <span className="truncate pr-2 uppercase">
                  {activeActivity === 'explorer' && 'Explorer'}
                  {activeActivity === 'search' && 'Search'}
                  {activeActivity === 'git' && 'Source Control'}
                  {activeActivity === 'commandCenter' && 'Command Center'}
                </span>
                
                {activeActivity === 'explorer' && sidebarWidth > 180 && (
                  <div className="flex items-center space-x-0.5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPromptModal({ type: 'file', targetDir: workspace, onSubmit: async (name) => {
                          await apiFetch('/api/files/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: workspace, name }) });
                          loadWorkspace();
                          openFile(workspace === '/' ? `/${name}` : `${workspace}/${name}`);
                        }});
                      }} 
                      title="New File..." 
                      className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"
                    >
                      <FilePlus size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPromptModal({ type: 'folder', targetDir: workspace, onSubmit: async (name) => {
                          await apiFetch('/api/files/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: workspace, name }) });
                          loadWorkspace();
                        }});
                      }} 
                      title="New Folder..." 
                      className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"
                    >
                      <FolderPlus size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        loadWorkspace();
                        setStatus('Explorer refreshed');
                        setTimeout(() => setStatus(''), 1500);
                      }} 
                      title="Refresh Explorer" 
                      className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"
                    >
                      <RefreshCw size={13} />
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBottomPanel(prev => !prev);
                      }} 
                      title="Toggle Terminal (Ctrl+`)" 
                      className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"
                    >
                      <TerminalSquare size={13} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Explorer Panel */}
              <div 
                className={`flex-1 overflow-y-auto outline-none pb-4 ${activeActivity === 'explorer' ? 'block' : 'hidden'}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleContextMenu(e, workspace, true);
                }}
                onClick={() => setSelectedPath(null)}
              >
                <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-gray-400 hover:bg-[#2a2d2e] cursor-default group">
                  <div className="flex items-center space-x-1 uppercase cursor-pointer min-w-0" onClick={() => {
                    document.dispatchEvent(new CustomEvent('desktop:pick-folder', {
                      detail: { 
                        initialPath: workspace, 
                        onSelect: (p: string) => {
                          store.openWindow({
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
                    <span className="truncate">{workspace.split('/').filter(Boolean).pop() || 'ROOT'}</span>
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
                      onContextMenu={handleContextMenu}
                      selectedPath={selectedPath}
                      onSelectPath={setSelectedPath}
                    />
                  ))}
                </div>
              </div>

              {/* Search & Replace Panel */}
              <div className={`flex-1 flex flex-col p-3 overflow-hidden ${activeActivity === 'search' ? 'flex' : 'hidden'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Search Workspace</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowReplaceInput(prev => !prev)}
                      className={`p-1 rounded text-xs transition-colors ${showReplaceInput ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                      title="Toggle Replace"
                    >
                      <Replace size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setIsGrepCaseSensitive(prev => !prev);
                        if (grepQuery.trim().length >= 2) {
                          setTimeout(handleGrepSearch, 50);
                        }
                      }}
                      className={`p-1 rounded text-xs transition-colors ${isGrepCaseSensitive ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                      title="Match Case (Aa)"
                    >
                      <CaseSensitive size={13} />
                    </button>
                  </div>
                </div>

                {/* Search Input Box */}
                <div className="space-y-1.5 mb-2">
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      placeholder="Search text in files..."
                      value={grepQuery}
                      onChange={(e) => setGrepQuery(e.target.value)}
                      className="w-full bg-[#3c3c3c] text-white px-2.5 py-1 text-xs border border-[#3c3c3c] focus:border-blue-500 outline-none rounded pr-6"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGrepSearch();
                      }}
                    />
                    {grepQuery && (
                      <button onClick={() => { setGrepQuery(''); setGrepResults([]); }} className="absolute right-1.5 text-gray-400 hover:text-white">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {showReplaceInput && (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        placeholder="Replace with..."
                        value={grepReplace}
                        onChange={(e) => setGrepReplace(e.target.value)}
                        className="flex-1 bg-[#3c3c3c] text-white px-2.5 py-1 text-xs border border-[#3c3c3c] focus:border-blue-500 outline-none rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && grepResults.length > 0) {
                            const uniqueFiles = Array.from(new Set(grepResults.map(r => r.file)));
                            setReplaceConfirmModal({
                              q: grepQuery,
                              replaceWith: grepReplace,
                              totalMatches: grepResults.length,
                              totalFiles: uniqueFiles.length,
                              files: uniqueFiles
                            });
                          }
                        }}
                      />
                      <button
                        disabled={grepResults.length === 0}
                        onClick={() => {
                          const uniqueFiles = Array.from(new Set(grepResults.map(r => r.file)));
                          setReplaceConfirmModal({
                            q: grepQuery,
                            replaceWith: grepReplace,
                            totalMatches: grepResults.length,
                            totalFiles: uniqueFiles.length,
                            files: uniqueFiles
                          });
                        }}
                        className="px-2 py-1 bg-[#3e3e42] hover:bg-[#4e4e52] disabled:opacity-40 text-white rounded text-[11px] font-medium shrink-0"
                        title="Replace All"
                      >
                        Replace All
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={handleGrepSearch}
                    disabled={grepLoading || grepQuery.trim().length < 2}
                    className="w-full py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Search size={12} /> {grepLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {/* Search Results List */}
                <div className="flex-1 overflow-y-auto text-xs text-gray-300 pr-1 [scrollbar-width:thin]">
                  {grepLoading ? (
                    <div className="p-4 text-center text-gray-400 text-xs">Searching workspace...</div>
                  ) : grepResults.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[11px] text-gray-400 pb-1 border-b border-[#333] flex justify-between">
                        <span>{grepResults.length} matches in {Object.keys(groupedGrepResults).length} files</span>
                        <button onClick={() => setGrepResults([])} className="hover:text-white">Clear</button>
                      </div>
                      {Object.entries(groupedGrepResults).map(([file, matches]) => (
                        <div key={file} className="border border-[#2d2d2d] rounded bg-[#252526] overflow-hidden">
                          <div 
                            className="flex items-center justify-between px-2 py-1 bg-[#2d2d2d] text-gray-200 cursor-pointer hover:bg-[#353535]"
                            onClick={() => openFile(workspace === '/' ? `/${file}` : `${workspace}/${file}`, matches[0]?.line, matches[0]?.column)}
                          >
                            <div className="flex items-center gap-1.5 truncate min-w-0">
                              <FileCode2 size={12} className="text-yellow-400 shrink-0" />
                              <span className="truncate font-medium text-[11px]">{file}</span>
                            </div>
                            <span className="text-[10px] bg-[#3e3e42] px-1.5 py-0.2 rounded text-gray-300 ml-1 shrink-0">{matches.length}</span>
                          </div>
                          <div className="divide-y divide-[#2a2a2a]">
                            {matches.map((m, idx) => (
                              <div
                                key={idx}
                                onClick={() => openFile(workspace === '/' ? `/${m.file}` : `${workspace}/${m.file}`, m.line, m.column)}
                                className="px-2 py-1 hover:bg-[#1e1e1e] cursor-pointer flex items-baseline gap-2 group transition-colors"
                              >
                                <span className="text-[10px] text-gray-500 font-mono w-6 shrink-0 text-right group-hover:text-blue-400">{m.line}:</span>
                                <span className="text-[11px] font-mono text-gray-300 truncate group-hover:text-white">{m.preview}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : grepQuery.length >= 2 ? (
                    <div className="p-4 text-center text-gray-500 text-xs">No matches found for "{grepQuery}"</div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-xs leading-relaxed">
                      Type a search query (min 2 chars) and click Search or press Enter.
                    </div>
                  )}
                </div>
              </div>

              {/* Git Source Control Panel */}
              <div className={`flex-1 flex flex-col overflow-hidden ${activeActivity === 'git' ? 'flex' : 'hidden'}`}>
                {/* Header bar */}
                <div className="px-4 py-2 border-b border-[#333] flex items-center justify-between shrink-0 bg-[#252526]">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Source Control</span>
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={() => refreshGitStatus()} 
                      disabled={gitLoading}
                      className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded"
                      title="Refresh"
                    >
                      <RefreshCw size={13} className={gitLoading ? 'animate-spin' : ''} />
                    </button>
                    {gitStatus && (
                      <>
                        <button 
                          onClick={() => handleGitSync('fetch')} 
                          disabled={gitLoading}
                          className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded"
                          title="Fetch"
                        >
                          <Download size={13} />
                        </button>
                        <button 
                          onClick={() => handleGitSync('pull')} 
                          disabled={gitLoading}
                          className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded"
                          title="Pull"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button 
                          onClick={() => handleGitSync('push')} 
                          disabled={gitLoading}
                          className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded"
                          title="Push"
                        >
                          <ArrowUp size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {gitStatus ? (
                  <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-4 text-xs">
                    {/* Branch switcher & info */}
                    <div className="flex items-center justify-between bg-[#2a2d2e] px-2.5 py-1.5 rounded border border-[#3e3e42]">
                      <div className="flex items-center text-blue-400 font-medium truncate mr-2">
                        <GitBranch size={13} className="mr-1.5 shrink-0" />
                        <span className="truncate">{gitStatus.branch}</span>
                      </div>
                      <select 
                        className="bg-[#1e1e1e] text-[11px] text-gray-300 border border-[#444] rounded px-1.5 py-0.5 max-w-[120px] focus:outline-none"
                        value={gitStatus.branch}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleGitCheckout('', true);
                          } else {
                            handleGitCheckout(e.target.value, false);
                          }
                        }}
                      >
                        {gitStatus.branches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        <option value="__new__">+ New Branch...</option>
                      </select>
                    </div>

                    {/* Commit Input Area */}
                    <div className="space-y-2">
                      <textarea
                        className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded p-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                        rows={2}
                        placeholder="Message (Ctrl+Enter to commit)"
                        value={gitCommitMsg}
                        onChange={(e) => setGitCommitMsg(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleGitCommit();
                          }
                        }}
                      />
                      <button
                        onClick={handleGitCommit}
                        disabled={gitLoading || !gitCommitMsg.trim() || (gitStatus.staged.length === 0 && gitStatus.unstaged.length === 0 && gitStatus.untracked.length === 0)}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-medium text-xs rounded transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check size={13} />
                        <span>Commit</span>
                      </button>
                    </div>

                    {/* Staged Changes */}
                    {gitStatus.staged.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                          <span>STAGED CHANGES ({gitStatus.staged.length})</span>
                          <button 
                            onClick={() => handleGitUnstage(undefined, true)}
                            className="text-gray-400 hover:text-white text-[10px] p-0.5 hover:bg-[#333] rounded"
                            title="Unstage All"
                          >
                            <Minus size={12} />
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {gitStatus.staged.map(f => (
                            <div 
                              key={`staged-${f.file}`} 
                              className="group flex items-center justify-between py-1 px-1.5 hover:bg-[#2a2d2e] rounded cursor-pointer text-gray-200"
                            >
                              <div 
                                className="flex items-center truncate flex-1 mr-2"
                                onClick={() => handleGitDiff(f.file, true)}
                                title={`Click to diff: ${f.file}`}
                              >
                                <span className="truncate text-xs">{f.file}</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <span className="text-[10px] font-bold px-1 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                                  {f.status}
                                </span>
                                <button 
                                  onClick={() => handleGitUnstage(f.file)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#444] rounded text-gray-400 hover:text-white"
                                  title="Unstage"
                                >
                                  <Minus size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Changes (Unstaged) */}
                    {gitStatus.unstaged.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                          <span>CHANGES ({gitStatus.unstaged.length})</span>
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={() => handleGitStage(undefined, true)}
                              className="text-gray-400 hover:text-white text-[10px] p-0.5 hover:bg-[#333] rounded"
                              title="Stage All"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {gitStatus.unstaged.map(f => (
                            <div 
                              key={`unstaged-${f.file}`} 
                              className="group flex items-center justify-between py-1 px-1.5 hover:bg-[#2a2d2e] rounded cursor-pointer text-gray-200"
                            >
                              <div 
                                className="flex items-center truncate flex-1 mr-2"
                                onClick={() => handleGitDiff(f.file, false)}
                                title={`Click to diff: ${f.file}`}
                              >
                                <span className="truncate text-xs">{f.file}</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <span className="text-[10px] font-bold px-1 rounded bg-amber-950/70 text-amber-400 border border-amber-800/60">
                                  {f.status}
                                </span>
                                <button 
                                  onClick={() => handleGitDiscard(f.file, false)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#444] rounded text-gray-400 hover:text-rose-400"
                                  title="Discard Changes"
                                >
                                  <RotateCcw size={11} />
                                </button>
                                <button 
                                  onClick={() => handleGitStage(f.file)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#444] rounded text-gray-400 hover:text-white"
                                  title="Stage"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Untracked Files */}
                    {gitStatus.untracked.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                          <span>UNTRACKED ({gitStatus.untracked.length})</span>
                          <button 
                            onClick={() => handleGitStage(undefined, true)}
                            className="text-gray-400 hover:text-white text-[10px] p-0.5 hover:bg-[#333] rounded"
                            title="Stage All"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {gitStatus.untracked.map(f => (
                            <div 
                              key={`untracked-${f.file}`} 
                              className="group flex items-center justify-between py-1 px-1.5 hover:bg-[#2a2d2e] rounded cursor-pointer text-gray-200"
                            >
                              <div 
                                className="flex items-center truncate flex-1 mr-2"
                                onClick={() => handleGitDiff(f.file, false)}
                                title={`Click to preview: ${f.file}`}
                              >
                                <span className="truncate text-xs text-gray-300">{f.file}</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <span className="text-[10px] font-bold px-1 rounded bg-gray-800 text-gray-400">
                                  U
                                </span>
                                <button 
                                  onClick={() => handleGitDiscard(f.file, true)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#444] rounded text-gray-400 hover:text-rose-400"
                                  title="Delete untracked file"
                                >
                                  <Trash2 size={11} />
                                </button>
                                <button 
                                  onClick={() => handleGitStage(f.file)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#444] rounded text-gray-400 hover:text-white"
                                  title="Stage"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {gitStatus.clean && (
                      <div className="py-8 text-center text-gray-500 text-xs">
                        <Check size={24} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                        Working tree is clean.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-400 text-xs space-y-3">
                    <p className="leading-relaxed">This workspace is not a Git repository.</p>
                    <button
                      onClick={handleGitInit}
                      disabled={gitLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                    >
                      Initialize Repository
                    </button>
                  </div>
                )}
              </div>

              {/* Developer Command Center */}
              <div className={`flex-1 flex flex-col overflow-hidden ${activeActivity === 'commandCenter' ? 'flex' : 'hidden'}`}>
                {/* Header bar */}
                <div className="px-4 py-2 border-b border-[#333] flex items-center justify-between shrink-0 bg-[#252526]">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Command Center</span>
                  <button 
                    onClick={() => loadCommandCenter()} 
                    disabled={ccLoading}
                    className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded transition-colors"
                    title="Refresh Command Center"
                  >
                    <RefreshCw size={13} className={ccLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                  {/* Project Awareness Card */}
                  <div className="bg-[#2a2d2e] p-3 rounded-lg border border-[#3e3e42] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-200 truncate">{ccSummary?.project?.name || 'Workspace'}</span>
                      {ccSummary?.project?.packageManager && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 font-mono text-[10px] border border-blue-700/40">
                          {ccSummary.project.packageManager}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ccSummary?.project?.framework && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 text-[10px] border border-purple-700/30">
                          {ccSummary.project.framework}
                        </span>
                      )}
                      {ccSummary?.project?.ecosystems?.map(eco => (
                        <span key={eco} className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px] border border-gray-700">
                          {eco}
                        </span>
                      ))}
                      {ccSummary?.project?.isMonorepo && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 text-[10px] border border-amber-700/30">
                          Monorepo
                        </span>
                      )}
                    </div>
                    {/* Git Branch Badge */}
                    {ccSummary?.git?.isRepo && (
                      <div 
                        onClick={() => setActiveActivity('git')} 
                        className="flex items-center justify-between text-[11px] text-gray-400 hover:text-white cursor-pointer pt-1 border-t border-[#383838]"
                        title="Click to view Source Control"
                      >
                        <div className="flex items-center truncate">
                          <GitBranch size={12} className="mr-1.5 text-blue-400 shrink-0" />
                          <span className="truncate text-blue-300">{ccSummary.git.currentBranch}</span>
                        </div>
                        <span className={`text-[10px] px-1 rounded ${ccSummary.git.isClean ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {ccSummary.git.isClean ? 'Clean' : `${ccSummary.git.unstagedCount + ccSummary.git.untrackedCount} changes`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Jump Hub */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Quick Jump</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { setShowBottomPanel(true); setBottomPanelTab('terminal'); }}
                        className="flex items-center px-2 py-1.5 bg-[#2a2d2e] hover:bg-[#333] text-gray-300 hover:text-white rounded border border-[#3e3e42] transition-colors"
                      >
                        <TerminalSquare size={13} className="mr-1.5 text-green-400 shrink-0" />
                        <span className="truncate">Terminal</span>
                      </button>
                      <button
                        onClick={() => setActiveActivity('git')}
                        className="flex items-center px-2 py-1.5 bg-[#2a2d2e] hover:bg-[#333] text-gray-300 hover:text-white rounded border border-[#3e3e42] transition-colors"
                      >
                        <GitBranch size={13} className="mr-1.5 text-blue-400 shrink-0" />
                        <span className="truncate">Git Hub</span>
                      </button>
                      <button
                        onClick={() => { setShowBottomPanel(true); setBottomPanelTab('ports'); }}
                        className="flex items-center px-2 py-1.5 bg-[#2a2d2e] hover:bg-[#333] text-gray-300 hover:text-white rounded border border-[#3e3e42] transition-colors"
                      >
                        <Play size={13} className="mr-1.5 text-purple-400 shrink-0" />
                        <span className="truncate">Ports & Previews</span>
                      </button>
                      <button
                        onClick={() => setActiveActivity('explorer')}
                        className="flex items-center px-2 py-1.5 bg-[#2a2d2e] hover:bg-[#333] text-gray-300 hover:text-white rounded border border-[#3e3e42] transition-colors"
                      >
                        <LayoutPanelLeft size={13} className="mr-1.5 text-yellow-400 shrink-0" />
                        <span className="truncate">Explorer</span>
                      </button>
                    </div>
                  </div>

                  {/* Project Actions (Keyboard Navigable) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Project Actions</span>
                      <span className="text-[9px] text-gray-500">↑↓ to select, ↵ to run</span>
                    </div>

                    <div className="space-y-1">
                      {ccSummary?.actions && ccSummary.actions.length > 0 ? (
                        ccSummary.actions.map((act, idx) => {
                          const isSelected = ccSelectedIdx === idx;
                          const isRunning = act.isRunning;
                          const isStarting = ccRunningAction === act.id;

                          return (
                            <div
                              key={act.id}
                              onClick={() => {
                                setCcSelectedIdx(idx);
                                if (isRunning && act.processId) {
                                  handleStopCommandCenterAction(act.processId);
                                } else {
                                  handleRunCommandCenterAction(act.id);
                                }
                              }}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                                isSelected 
                                  ? 'bg-[#094771] border-blue-400 text-white' 
                                  : 'bg-[#2a2d2e] hover:bg-[#333] border-[#3e3e42] text-gray-200'
                              }`}
                            >
                              <div className="flex items-center min-w-0 mr-2">
                                {isRunning ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shrink-0 animate-pulse" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-gray-500 mr-2 shrink-0" />
                                )}
                                <div className="truncate">
                                  <div className="font-medium text-xs truncate">{act.label}</div>
                                  <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {act.command} {act.args.join(' ')}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center shrink-0 space-x-1">
                                {isRunning ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (act.processId) handleStopCommandCenterAction(act.processId);
                                    }}
                                    className="px-2 py-1 rounded bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-medium flex items-center gap-1"
                                    title="Stop process"
                                  >
                                    <Square size={10} />
                                    <span>Stop</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled={!act.isConfigured || isStarting}
                                    className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 ${
                                      !act.isConfigured 
                                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                    title={act.isConfigured ? 'Run action' : 'Action not configured'}
                                  >
                                    <Play size={10} />
                                    <span>{isStarting ? 'Starting...' : 'Run'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-gray-500 text-center py-4">No project actions detected</div>
                      )}
                    </div>
                  </div>

                  {/* Mini Process Manager */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Running Processes ({ccSummary?.processes?.filter(p => p.status === 'running' || p.status === 'starting').length || 0})
                      </span>
                    </div>

                    {ccSummary?.processes && ccSummary.processes.filter(p => p.status === 'running' || p.status === 'starting').length > 0 ? (
                      <div className="space-y-1.5">
                        {ccSummary.processes.filter(p => p.status === 'running' || p.status === 'starting').map(p => (
                          <div key={p.id} className="p-2 rounded bg-[#2a2d2e] border border-[#3e3e42] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center truncate min-w-0 mr-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shrink-0" />
                                <span className="font-medium text-gray-200 truncate">{p.name}</span>
                              </div>
                              {p.pid && (
                                <span className="text-[10px] font-mono text-gray-400 shrink-0">PID {p.pid}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between pt-1 border-t border-[#383838]">
                              <div className="flex items-center space-x-1.5">
                                {p.ports && p.ports.length > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-green-900/40 text-emerald-300 font-mono text-[10px] border border-emerald-700/40">
                                    :{p.ports[0]}
                                  </span>
                                )}
                                {p.previewUrl && (
                                  <a 
                                    href={p.previewUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-[10px] flex items-center"
                                  >
                                    <ExternalLink size={10} className="mr-0.5" />
                                    <span>Preview</span>
                                  </a>
                                )}
                              </div>
                              <button
                                onClick={() => handleStopCommandCenterAction(p.id)}
                                className="p-1 hover:bg-red-900/30 text-red-400 rounded text-[10px] flex items-center gap-1"
                                title="Stop Process"
                              >
                                <Square size={10} />
                                <span>Stop</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-[#242526] rounded border border-dashed border-[#3e3e42] text-center text-gray-500 text-[11px]">
                        No managed processes running.
                      </div>
                    )}
                  </div>

                  {/* Active Preview Targets */}
                  {ccSummary?.previews && ccSummary.previews.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                        Preview Targets ({ccSummary.previews.length})
                      </span>
                      <div className="space-y-1">
                        {ccSummary.previews.map(pr => (
                          <div key={pr.id} className="flex items-center justify-between p-2 rounded bg-[#2a2d2e] border border-[#3e3e42]">
                            <div className="truncate min-w-0 mr-2">
                              <div className="text-gray-200 font-medium truncate">{pr.name}</div>
                              <div className="text-emerald-400 text-[10px] font-mono truncate">{pr.previewUrl}</div>
                            </div>
                            <a
                              href={pr.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium shrink-0 flex items-center gap-1"
                            >
                              <ExternalLink size={10} />
                              <span>Open</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Resizer */}
            <div 
              className="w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize shrink-0 z-10 -ml-[1px] relative transition-colors"
              onPointerDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = sidebarWidth;
                const onMove = (moveEvent: PointerEvent | MouseEvent) => {
                  const newW = Math.max(140, Math.min(800, startW + (moveEvent.clientX - startX)));
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
          </>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tabs */}
          <div 
            className="flex h-9 bg-[#252526] overflow-x-auto overflow-y-hidden select-none [scrollbar-width:none] border-b border-[#1e1e1e]"
            onWheel={(e) => {
              if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
            }}
          >
            {openFiles.map((f) => {
              const name = f.path.split('/').pop() || f.path;
              const isActive = activeFile === f.path;
              return (
                <div 
                  key={f.path}
                  onClick={() => setActiveFile(f.path)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      closeFile(null, f.path);
                    }
                  }}
                  onContextMenu={(e) => handleTabContextMenu(e, f.path)}
                  className={`flex items-center h-full px-3 text-xs min-w-[120px] max-w-[220px] border-r border-[#1e1e1e] cursor-pointer group transition-colors ${
                    isActive ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500 font-medium' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#2b2b2b] hover:text-gray-200'
                  }`}
                >
                  <div className="mr-2 opacity-70 shrink-0">
                    {f.path.startsWith('preview:') ? (
                      <Globe size={13} className="text-blue-400" />
                    ) : name?.endsWith('.ts') || name?.endsWith('.tsx') ? (
                      <FileCode2 size={13} className="text-yellow-400" />
                    ) : (
                      <File size={13} />
                    )}
                  </div>
                  <span className="truncate flex-1" title={f.path}>
                    {f.path.startsWith('preview:') ? `Preview :${f.path.split(':')[1]}` : name}
                  </span>
                  {f.isDirty && <div className="w-2 h-2 rounded-full bg-white ml-1.5 opacity-70 shrink-0" title="Unsaved changes"></div>}
                  {isActive && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSplitFile(splitFile === f.path ? null : f.path);
                      }}
                      className="ml-1.5 p-0.5 rounded hover:bg-[#444] text-gray-400 hover:text-white"
                      title="Split Editor Right (Ctrl+\)"
                    >
                      <Columns size={12} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => closeFile(e, f.path)}
                    className={`ml-1 p-0.5 rounded hover:bg-[#444] ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Close (Ctrl+W)"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Breadcrumbs */}
          {activeFile && (
            <div className="h-6 flex items-center px-4 text-[11px] text-gray-400 bg-[#1e1e1e] border-b border-[#2d2d2d] shrink-0 overflow-x-auto [scrollbar-width:none]">
              {activeFile.split('/').filter(Boolean).map((part, i, arr) => {
                const isLast = i === arr.length - 1;
                const targetFolder = '/' + arr.slice(0, i + 1).join('/');
                return (
                  <span key={i} className="flex items-center">
                    <span 
                      className="hover:text-white hover:underline cursor-pointer transition-colors"
                      onClick={() => {
                        if (isLast) {
                          editorRef.current?.focus();
                        } else {
                          setSelectedPath(targetFolder);
                          setExpandedPaths(prev => new Set([...prev, targetFolder]));
                          setActiveActivity('explorer');
                        }
                      }}
                      title={isLast ? 'Click to focus editor' : `Reveal folder: ${targetFolder}`}
                    >
                      {part}
                    </span>
                    {!isLast && <ChevronRight size={12} className="mx-0.5 opacity-40" />}
                  </span>
                );
              })}
              {splitFile && (
                <span className="ml-3 text-blue-400 font-medium">| Split: {splitFile.split('/').pop()}</span>
              )}
              {status && <span className="ml-auto text-blue-400 font-medium animate-pulse">{status}</span>}
            </div>
          )}

          {/* Editor Work Area (Supports Dual Pane Split) */}
          <div className={`flex-1 flex ${splitOrientation === 'horizontal' ? 'flex-row' : 'flex-col'} min-w-0 min-h-0 relative`}>
            {/* Primary Editor Pane */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
              {loading && openFiles.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">Loading...</div>
              ) : !activeFile ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4 select-none">
                  <div className="text-5xl opacity-30">⚡</div>
                  <div className="text-xl font-medium text-gray-400">NebuCode IDE Workspace</div>
                  <div className="text-xs text-gray-500 max-w-sm text-center leading-relaxed">
                    Select a file from the explorer, press <kbd className="bg-[#2d2d2d] text-gray-300 px-1.5 py-0.5 rounded font-mono">Ctrl+P</kbd> to search files, or <kbd className="bg-[#2d2d2d] text-gray-300 px-1.5 py-0.5 rounded font-mono">Ctrl+`</kbd> to open terminal.
                  </div>
                </div>
              ) : activeFile.startsWith('preview:') ? (
                <div className="w-full h-full bg-white relative flex flex-col">
                  <div className="h-8 bg-[#2d2d2d] flex items-center px-4 shrink-0 justify-between text-[11px] text-gray-300 border-b border-[#3e3e42]">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-mono">http://{window.location.hostname}:{activeFile.split(':')[1]}</span>
                      <button onClick={() => {
                        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                        if (iframe) iframe.src = iframe.src;
                      }} className="hover:text-white px-2 py-0.5 bg-[#3e3e42] rounded">Reload</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const url = `http://${window.location.hostname}:${activeFile.split(':')[1]}`;
                        window.open(url, '_blank');
                      }} className="hover:text-white px-2 py-0.5 bg-[#3e3e42] rounded flex items-center gap-1">
                        <ExternalLink size={11} /> Open External
                      </button>
                    </div>
                  </div>
                  <iframe 
                    id="preview-iframe"
                    src={`http://${window.location.hostname}:${activeFile.split(':')[1]}/`} 
                    className="flex-1 w-full bg-white border-none"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-top-navigation"
                  />
                </div>
              ) : (
                <Editor
                  height="100%"
                  onMount={handleEditorDidMount}
                  language={getLang(activeFile)}
                  theme="vs-dark"
                  value={activeFileData?.content || ''}
                  onChange={(val) => handleEditorChange(val, activeFile)}
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

            {/* Split Pane */}
            {splitFile && (
              <>
                <div className={`${splitOrientation === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} bg-[#2d2d2d] hover:bg-blue-500 transition-colors shrink-0 z-10`} />
                <div className={`flex-1 flex flex-col min-w-0 min-h-0 relative bg-[#1e1e1e] ${splitOrientation === 'horizontal' ? 'border-l' : 'border-t'} border-[#2d2d2d]`}>
                  <div className="h-8 bg-[#252526] px-3 flex items-center justify-between text-xs text-gray-300 border-b border-[#1e1e1e]">
                    <span className="truncate font-medium flex items-center gap-1.5">
                      <FileCode2 size={13} className="text-blue-400" />
                      {splitFile.split('/').pop()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setSplitOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} 
                        title={`Switch to ${splitOrientation === 'horizontal' ? 'horizontal (down)' : 'vertical (side)'} split`} 
                        className="p-1 hover:bg-[#444] rounded text-gray-400 hover:text-white"
                      >
                        <Columns size={12} className={splitOrientation === 'vertical' ? 'rotate-90' : ''} />
                      </button>
                      <button 
                        onClick={() => setSplitFile(null)} 
                        title="Close Split" 
                        className="p-1 hover:bg-[#444] rounded text-gray-400 hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <Editor
                      height="100%"
                      onMount={(editor) => { splitEditorRef.current = editor; }}
                      language={getLang(splitFile)}
                      theme="vs-dark"
                      value={openFiles.find(f => f.path === splitFile)?.content || ''}
                      onChange={(val) => handleEditorChange(val, splitFile)}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        formatOnPaste: true,
                        padding: { top: 16 }
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Bottom Panel (Integrated Terminal & Ports) */}
          {showBottomPanel && (
            <div style={{ height: bottomPanelHeight }} className="flex flex-col border-t border-[#3e3e42] bg-[#1e1e1e] relative shrink-0">
              {/* Panel Resizer */}
              <div 
                className="h-[4px] bg-transparent hover:bg-blue-500 cursor-row-resize absolute top-0 left-0 right-0 z-10 -mt-[2px] transition-colors"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startH = bottomPanelHeight;
                  const onMove = (moveEvent: PointerEvent | MouseEvent) => {
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
              <div className="flex items-center px-4 h-9 shrink-0 bg-[#1e1e1e] border-b border-[#2d2d2d]">
                <div 
                  onClick={() => setBottomPanelTab('terminal')}
                  className={`cursor-pointer text-[11px] uppercase tracking-wider h-full flex items-center px-2 mr-4 shrink-0 transition-colors ${
                    bottomPanelTab === 'terminal' ? 'text-gray-200 border-b-2 border-blue-500 font-semibold' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Terminal ({terminals.length})
                </div>
                <div 
                  onClick={() => setBottomPanelTab('ports')}
                  className={`cursor-pointer text-[11px] uppercase tracking-wider h-full flex items-center px-2 mr-4 shrink-0 transition-colors ${
                    bottomPanelTab === 'ports' ? 'text-gray-200 border-b-2 border-blue-500 font-semibold' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Ports & Preview {devServers.length > 0 && <span className="ml-1.5 bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[9px]">{devServers.length}</span>}
                </div>
                <div 
                  onClick={() => setBottomPanelTab('problems')}
                  className={`cursor-pointer text-[11px] uppercase tracking-wider h-full flex items-center px-2 mr-4 shrink-0 transition-colors ${
                    bottomPanelTab === 'problems' ? 'text-gray-200 border-b-2 border-blue-500 font-semibold' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Problems {problems.length > 0 && (
                    <span className={`ml-1.5 text-white rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      problems.some(p => p.severity === 'error') ? 'bg-red-600' : 'bg-yellow-600'
                    }`}>
                      {problems.length}
                    </span>
                  )}
                </div>

                <div className="flex-1"></div>

                <div className="flex items-center space-x-2 ml-2 shrink-0">
                  <button onClick={() => addTerminal(workspace)} title="New Terminal" className="text-gray-400 hover:text-white p-1 rounded"><Plus size={14}/></button>
                  {terminals.length === 1 && (
                    <button onClick={() => killTerminal(terminals[0]!.id)} title="Kill Terminal" className="text-gray-400 hover:text-white p-1 rounded"><Trash2 size={14}/></button>
                  )}
                  <button onClick={() => setShowBottomPanel(false)} title="Close Panel (Ctrl+`)" className="text-gray-400 hover:text-white p-1 rounded"><X size={14}/></button>
                </div>
              </div>

              {/* Terminal Container & Multi-Terminal Sidebar */}
              <div className="flex-1 min-h-0 flex relative">
                <div className={`flex-1 p-2 pl-4 relative min-h-0 ${bottomPanelTab === 'terminal' ? 'block' : 'hidden'}`}>
                  {terminals.map(t => (
                    <div 
                      key={t.id}
                      className="w-full h-full"
                      style={{ display: activeTermId === t.id && bottomPanelTab === 'terminal' ? 'block' : 'none' }}
                    >
                      <IntegratedTerminal workspace={t.cwd} termId={`${winId}_integrated_${t.id}`} />
                    </div>
                  ))}
                </div>
                
                {bottomPanelTab === 'terminal' && terminals.length > 1 && (
                  <div className="w-36 bg-[#1e1e1e] flex flex-col shrink-0 overflow-y-auto border-l border-[#2d2d2d] [scrollbar-width:none]">
                    {terminals.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => setActiveTermId(t.id)} 
                        className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer text-[11px] group transition-colors ${
                          activeTermId === t.id ? 'bg-[#2d2d2d] text-white border-l-2 border-blue-500' : 'text-gray-400 hover:bg-[#252526] border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center truncate min-w-0">
                          <TerminalSquare size={12} className="mr-1.5 opacity-70 shrink-0" />
                          <span className="truncate">{t.name || 'bash'}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); killTerminal(t.id); }} 
                          className={`p-0.5 rounded hover:bg-gray-600 ${activeTermId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          title="Kill Terminal"
                        >
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ports & Dev Servers Panel */}
                {bottomPanelTab === 'ports' && (
                  <div className="flex-1 p-3 overflow-y-auto bg-[#1e1e1e]">
                    {devServers.length === 0 ? (
                      <div className="text-gray-500 text-xs flex flex-col items-center justify-center h-full py-8 space-y-2 select-none">
                        <p className="font-medium text-gray-400">No development servers detected in this workspace.</p>
                        <p className="text-[11px] text-gray-500">Run <code className="bg-[#2d2d2d] text-gray-300 px-1 py-0.5 rounded font-mono">npm run dev</code> or start an HTTP server in the terminal.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1.5 border-b border-[#333]">
                          <span className="font-semibold uppercase tracking-wider">Detected Servers ({devServers.length})</span>
                          <span className="text-gray-500 text-[10px]">Auto-scanned &bull; Workspace Scoped</span>
                        </div>
                        {devServers.map((srv: any) => (
                          <div key={srv.port} className="flex items-center justify-between p-2.5 border border-[#3e3e42] rounded bg-[#252526] hover:bg-[#2a2d2e] transition-colors">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-400 font-mono font-bold text-xs">Port {srv.port}</span>
                                <span className="text-[9px] font-semibold uppercase bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded">
                                  Running
                                </span>
                                {srv.localAddress && srv.localAddress !== '0.0.0.0' && srv.localAddress !== '::' && (
                                  <span className="text-[9px] text-yellow-400 bg-yellow-900/40 px-1.5 py-0.5 rounded font-mono">
                                    {srv.localAddress}
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 text-[11px] mt-1 font-mono">
                                {srv.process} (PID: {srv.pid}) &bull; <span className="text-gray-500">{srv.cwd}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  const previewPath = `preview:${srv.port}`;
                                  setOpenFiles(prev => {
                                    if (!prev.find(f => f.path === previewPath)) {
                                      return [...prev, { path: previewPath, content: '', original: '', isDirty: false }];
                                    }
                                    return prev;
                                  });
                                  setActiveFile(previewPath);
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] flex items-center gap-1.5 transition-colors shadow-sm"
                              >
                                <Play size={11} />
                                Open Preview Tab
                              </button>
                              <button
                                onClick={() => {
                                  const url = `http://${window.location.hostname}:${srv.port}`;
                                  window.open(url, '_blank');
                                }}
                                className="px-2 py-1 bg-[#3e3e42] hover:bg-[#4a4a4d] text-gray-200 rounded text-[11px] transition-colors"
                                title="Open in External Browser"
                              >
                                External
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Problems Panel */}
                {bottomPanelTab === 'problems' && (
                  <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
                    {/* Problems Toolbar */}
                    <div className="h-8 bg-[#252526] border-b border-[#2d2d2d] flex items-center px-3 gap-2 shrink-0 text-xs">
                      <button
                        onClick={() => runDiagnostics('auto')}
                        disabled={isRunningDiagnostics}
                        className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-[11px] flex items-center gap-1 transition-colors"
                        title="Run project diagnostic typecheck/linter"
                      >
                        <RefreshCw size={11} className={isRunningDiagnostics ? 'animate-spin' : ''} />
                        {isRunningDiagnostics ? 'Checking...' : 'Check Workspace'}
                      </button>

                      <button
                        onClick={clearProblems}
                        disabled={problems.length === 0}
                        className="px-2 py-0.5 bg-[#333] hover:bg-[#444] disabled:opacity-40 text-gray-300 rounded text-[11px] transition-colors"
                        title="Clear problems list"
                      >
                        Clear
                      </button>

                      <div className="h-4 w-px bg-gray-700 mx-1" />

                      {/* Filter by severity */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setProblemsSeverityFilter('all')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                            problemsSeverityFilter === 'all' ? 'bg-[#37373d] text-white font-medium' : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          All ({problems.length})
                        </button>
                        <button
                          onClick={() => setProblemsSeverityFilter('error')}
                          className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
                            problemsSeverityFilter === 'error' ? 'bg-[#37373d] text-red-400 font-medium' : 'text-gray-400 hover:text-red-400'
                          }`}
                        >
                          <AlertCircle size={11} className="text-red-400" />
                          Errors ({problems.filter(p => p.severity === 'error').length})
                        </button>
                        <button
                          onClick={() => setProblemsSeverityFilter('warning')}
                          className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
                            problemsSeverityFilter === 'warning' ? 'bg-[#37373d] text-yellow-400 font-medium' : 'text-gray-400 hover:text-yellow-400'
                          }`}
                        >
                          <AlertTriangle size={11} className="text-yellow-400" />
                          Warnings ({problems.filter(p => p.severity === 'warning').length})
                        </button>
                      </div>

                      <div className="flex-1" />

                      {/* Filter Search Input */}
                      <div className="relative flex items-center">
                        <Filter size={11} className="absolute left-2 text-gray-500" />
                        <input
                          type="text"
                          value={problemsFilter}
                          onChange={e => setProblemsFilter(e.target.value)}
                          placeholder="Filter problems..."
                          className="bg-[#1e1e1e] border border-[#3c3c3c] focus:border-blue-500 rounded pl-6 pr-2 py-0.5 text-[11px] text-gray-200 placeholder-gray-500 outline-none w-44"
                        />
                      </div>
                    </div>

                    {/* Problems List */}
                    <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
                      {(() => {
                        const filtered = problems.filter(p => {
                          if (problemsSeverityFilter !== 'all' && p.severity !== problemsSeverityFilter) return false;
                          if (problemsFilter) {
                            const q = problemsFilter.toLowerCase();
                            return (
                              p.message.toLowerCase().includes(q) ||
                              p.file.toLowerCase().includes(q) ||
                              (p.code && p.code.toLowerCase().includes(q)) ||
                              (p.source && p.source.toLowerCase().includes(q))
                            );
                          }
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-gray-500 text-xs flex flex-col items-center justify-center h-full py-8 space-y-2 select-none font-sans">
                              <CheckCircle2 size={24} className="text-green-500/70 mb-1" />
                              <span>{problems.length === 0 ? 'No problems detected in workspace' : 'No problems match filter'}</span>
                              {problems.length === 0 && (
                                <button
                                  onClick={() => runDiagnostics('auto')}
                                  className="mt-2 px-3 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-[11px]"
                                >
                                  Run Diagnostics Check
                                </button>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1">
                            {filtered.map(p => (
                              <div
                                key={p.id}
                                onClick={() => jumpToProblem(p)}
                                className="flex items-start gap-2.5 px-2.5 py-1.5 rounded hover:bg-[#2a2d2e] cursor-pointer group transition-colors border border-transparent hover:border-[#3c3c3c]"
                                title="Click to navigate to error location in editor"
                              >
                                <span className="mt-0.5 shrink-0">
                                  {p.severity === 'error' ? (
                                    <AlertCircle size={13} className="text-red-400" />
                                  ) : p.severity === 'warning' ? (
                                    <AlertTriangle size={13} className="text-yellow-400" />
                                  ) : (
                                    <Info size={13} className="text-blue-400" />
                                  )}
                                </span>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-gray-200 select-text leading-snug font-sans text-[12px]">{p.message}</span>
                                    {p.code && (
                                      <span className="text-[10px] px-1 bg-[#333] text-gray-400 rounded shrink-0">{p.code}</span>
                                    )}
                                    {p.source && (
                                      <span className="text-[10px] text-gray-500 shrink-0">[{p.source}]</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-400 mt-0.5 font-mono group-hover:text-blue-400 transition-colors">
                                    {p.file}:{p.line}:{p.column}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Status Bar Bottom */}
          <div className="h-6 bg-[#007acc] text-white flex items-center px-3 text-xs justify-between shrink-0">
            <div className="flex space-x-3">
              <span className="flex items-center hover:bg-white/20 px-1 rounded cursor-pointer"><GitBranch size={12} className="mr-1" /> {gitStatus?.branch || 'master'}</span>
              {problems.length > 0 ? (
                <span 
                  onClick={() => { setShowBottomPanel(true); setBottomPanelTab('problems'); }}
                  className="flex items-center gap-1.5 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  title="View problems"
                >
                  <AlertCircle size={12} className="text-red-300" /> {problems.filter(p => p.severity === 'error').length}
                  <AlertTriangle size={12} className="text-yellow-300 ml-1" /> {problems.filter(p => p.severity === 'warning').length}
                </span>
              ) : (
                <span 
                  onClick={() => { setShowBottomPanel(true); setBottomPanelTab('problems'); }}
                  className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  title="No problems"
                >
                  <CheckCircle2 size={12} className="text-green-300" />
                  <span>0 errors, 0 warnings</span>
                </span>
              )}
              {clipboard && <span className="hover:bg-white/20 px-1 rounded cursor-pointer">Clipboard: {clipboard.op.toUpperCase()} "{clipboard.name}"</span>}
            </div>
            <div className="flex space-x-4">
              <span className="hover:bg-white/20 px-1 rounded cursor-pointer">UTF-8</span>
              <span className="hover:bg-white/20 px-1 rounded cursor-pointer">{activeFile ? getLang(activeFile) : 'Plain Text'}</span>
              <span className="hover:bg-white/20 px-1 rounded cursor-pointer" onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}>Format</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Open & Command Palette Modal */}
      {quickOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-[15vh] bg-black/40 backdrop-blur-[1px]" onClick={() => setQuickOpen(false)}>
          <div className="bg-[#252526] rounded-md shadow-2xl border border-[#3e3e42] overflow-hidden flex flex-col w-[540px] max-h-[60vh]" onClick={e => e.stopPropagation()}>
            <div className="p-2 border-b border-[#3e3e42] flex items-center">
              <Search size={15} className="text-gray-400 mx-2 shrink-0" />
              <input
                autoFocus
                type="text"
                className="w-full bg-transparent text-[#cccccc] text-[13px] focus:outline-none"
                placeholder="Search files by name (or type '>' for commands)..."
                value={qoQuery}
                onChange={e => {
                  setQoQuery(e.target.value);
                  setQoSelectedIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setQuickOpen(false);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const count = qoQuery.startsWith('>') ? filteredCommands.length : (qoResults.length > 0 ? qoResults.length : 0);
                    if (count > 0) setQoSelectedIndex(prev => (prev + 1) % count);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const count = qoQuery.startsWith('>') ? filteredCommands.length : (qoResults.length > 0 ? qoResults.length : 0);
                    if (count > 0) setQoSelectedIndex(prev => (prev - 1 + count) % count);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (qoQuery.startsWith('>')) {
                      const selected = filteredCommands[qoSelectedIndex];
                      if (selected) {
                        setQuickOpen(false);
                        selected.run();
                      }
                    } else {
                      const selected = qoResults[qoSelectedIndex];
                      if (selected) {
                        openFile(workspace === '/' ? `/${selected}` : `${workspace}/${selected}`);
                        setQuickOpen(false);
                        setQoQuery('');
                      }
                    }
                  }
                }}
              />
            </div>

            <div className="overflow-y-auto py-1 max-h-[45vh]">
              {qoQuery.startsWith('>') ? (
                filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, idx) => {
                    const isSelected = qoSelectedIndex === idx;
                    return (
                      <div 
                        key={cmd.id}
                        className={`px-4 py-2 text-[13px] cursor-pointer flex items-center gap-2.5 transition-colors ${
                          isSelected ? 'bg-[#094771] text-white font-medium' : 'text-gray-300 hover:bg-[#2a2d2e]'
                        }`}
                        onClick={() => {
                          setQuickOpen(false);
                          cmd.run();
                        }}
                        onMouseEnter={() => setQoSelectedIndex(idx)}
                      >
                        <span className={isSelected ? 'text-white' : 'text-gray-400'}>{cmd.icon}</span>
                        <span className="truncate">{cmd.title}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-500">No commands matching "{qoQuery.slice(1)}"</div>
                )
              ) : qoResults.length > 0 ? (
                qoResults.map((r, idx) => {
                  const isSelected = qoSelectedIndex === idx;
                  const filename = r.split('/').pop() || r;
                  const dir = r.includes('/') ? r.substring(0, r.lastIndexOf('/')) : '';
                  const isRecent = qoQuery.length === 0;
                  return (
                    <div 
                      key={r} 
                      className={`px-3 py-1.5 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-[#094771] text-white font-medium' : 'text-gray-300 hover:bg-[#2a2d2e]'
                      }`}
                      onClick={() => {
                        openFile(workspace === '/' ? `/${r}` : `${workspace}/${r}`);
                        setQuickOpen(false);
                        setQoQuery('');
                      }}
                      onMouseEnter={() => setQoSelectedIndex(idx)}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {isRecent ? (
                          <Clock size={13} className={isSelected ? 'text-white' : 'text-blue-400 shrink-0'} />
                        ) : (
                          <FileCode2 size={13} className={isSelected ? 'text-white' : 'text-yellow-400 shrink-0'} />
                        )}
                        <span className="font-medium truncate">{filename}</span>
                        {dir && <span className={`text-[11px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>{dir}</span>}
                      </div>
                      {isRecent && <span className={`text-[10px] uppercase tracking-wider shrink-0 ml-2 ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>Recent</span>}
                    </div>
                  );
                })
              ) : qoQuery.length > 0 ? (
                <div className="px-4 py-3 text-xs text-gray-500">No matching files found. Type &gt; for commands.</div>
              ) : (
                <div className="px-4 py-2.5 text-xs text-gray-500">Type a file name or '&gt;' to execute commands.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-[1px]" onClick={() => setRenameModal(null)}>
          <div className="bg-[#252526] rounded-md shadow-2xl w-80 overflow-hidden border border-[#3e3e42]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-2.5 border-b border-[#3e3e42] bg-[#2d2d2d] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-gray-200">Rename</h3>
              <button onClick={() => setRenameModal(null)} className="text-gray-400 hover:text-white"><X size={14} /></button>
            </div>
            <div className="p-4">
              <input
                autoFocus
                type="text"
                defaultValue={renameModal.initialName}
                className="w-full bg-[#3c3c3c] border border-[#3e3e42] text-[#cccccc] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const newName = e.currentTarget.value.trim();
                    if (!newName || newName === renameModal.initialName) {
                      setRenameModal(null);
                      return;
                    }
                    const oldPath = renameModal.path;
                    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
                    const newPath = parentDir === '/' ? `/${newName}` : `${parentDir}/${newName}`;
                    
                    try {
                      await apiFetch('/api/files/rename', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ oldPath, newPath })
                      });
                      
                      // Update open files
                      setOpenFiles(prev => prev.map(f => {
                        if (f.path === oldPath) return { ...f, path: newPath };
                        if (f.path.startsWith(oldPath + '/')) {
                          return { ...f, path: newPath + f.path.slice(oldPath.length) };
                        }
                        return f;
                      }));
                      if (activeFile === oldPath) setActiveFile(newPath);
                      if (splitFile === oldPath) setSplitFile(newPath);
                      
                      setRenameModal(null);
                      loadWorkspace();
                      setStatus(`Renamed to "${newName}"`);
                      setTimeout(() => setStatus(''), 2000);
                    } catch (err: any) {
                      setStatus(`Rename failed: ${err.message}`);
                    }
                  } else if (e.key === 'Escape') {
                    setRenameModal(null);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-[1px]" onClick={() => setDeleteModal(null)}>
          <div className="bg-[#252526] rounded-md shadow-2xl w-96 overflow-hidden border border-[#3e3e42]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#3e3e42] bg-[#2d2d2d]">
              <h3 className="font-semibold text-xs text-red-400 flex items-center gap-1.5">
                <Trash2 size={14} /> Delete {deleteModal.isDir ? 'Folder' : 'File'}
              </h3>
            </div>
            <div className="p-4 text-gray-300 text-xs leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white font-mono">{deleteModal.name}</strong>?
              {deleteModal.isDir && <p className="mt-2 text-yellow-400">All contents inside this directory will be deleted.</p>}
            </div>
            <div className="px-4 py-2.5 bg-[#1e1e1e] border-t border-[#3e3e42] flex justify-end gap-2">
              <button 
                onClick={async () => {
                  try {
                    await apiFetch(`/api/files?p=${encodeURIComponent(deleteModal.path)}`, { method: 'DELETE' });
                    setOpenFiles(prev => prev.filter(f => !f.path.startsWith(deleteModal.path)));
                    if (activeFile && activeFile.startsWith(deleteModal.path)) setActiveFile(null);
                    if (splitFile && splitFile.startsWith(deleteModal.path)) setSplitFile(null);
                    setDeleteModal(null);
                    loadWorkspace();
                    setStatus(`Deleted "${deleteModal.name}"`);
                    setTimeout(() => setStatus(''), 2000);
                  } catch (err: any) {
                    setStatus(`Delete failed: ${err.message}`);
                  }
                }} 
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium transition-colors"
              >
                Delete
              </button>
              <button onClick={() => setDeleteModal(null)} className="px-3 py-1.5 bg-[#3e3e42] hover:bg-[#4a4a4d] text-white rounded text-xs transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {unsavedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-[1px]">
          <div className="bg-[#252526] rounded-md shadow-2xl w-[350px] overflow-hidden border border-[#3e3e42]">
            <div className="px-4 py-3 border-b border-[#3e3e42] bg-[#2d2d2d]">
              <h3 className="font-semibold text-xs text-gray-200">Unsaved Changes</h3>
            </div>
            <div className="p-4 text-gray-300 text-xs">
              Do you want to save the changes you made to <strong className="text-white">{unsavedModal.filename}</strong>?
              <br/><br/>
              Your changes will be lost if you don't save them.
            </div>
            <div className="px-4 py-2.5 bg-[#1e1e1e] border-t border-[#3e3e42] flex justify-end gap-2">
              <button onClick={unsavedModal.onSave} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium">Save</button>
              <button onClick={unsavedModal.onDiscard} className="px-3 py-1.5 bg-[#3e3e42] hover:bg-[#4a4a4d] text-white rounded text-xs">Don't Save</button>
              <button onClick={unsavedModal.onCancel} className="px-3 py-1.5 bg-[#3e3e42] hover:bg-[#4a4a4d] text-white rounded text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* New File / New Folder Modal */}
      {promptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-[1px]" onClick={() => setPromptModal(null)}>
          <div className="bg-[#252526] rounded-md shadow-2xl w-84 overflow-hidden border border-[#3e3e42]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-2.5 border-b border-[#3e3e42] bg-[#2d2d2d] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-gray-200 flex items-center gap-1.5">
                {promptModal.type === 'folder' ? <FolderPlus size={14} className="text-blue-400" /> : <FilePlus size={14} className="text-yellow-400" />}
                {promptModal.type === 'folder' ? 'Create New Folder' : 'Create New File'}
              </h3>
              <button onClick={() => setPromptModal(null)} className="text-gray-400 hover:text-white"><X size={14} /></button>
            </div>
            <div className="p-4">
              <p className="text-[11px] text-gray-400 mb-2 truncate">In: <span className="text-gray-300 font-mono">{promptModal.targetDir}</span></p>
              <input
                autoFocus
                type="text"
                className="w-full bg-[#3c3c3c] border border-[#3e3e42] text-[#cccccc] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                placeholder={promptModal.type === 'folder' ? 'Folder name (e.g. components)...' : 'File name (e.g. index.ts)...'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      promptModal.onSubmit(val);
                      setPromptModal(null);
                    }
                  } else if (e.key === 'Escape') {
                    setPromptModal(null);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Workspace Replace Confirmation Modal */}
      {replaceConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-[1px]" onClick={() => setReplaceConfirmModal(null)}>
          <div className="bg-[#252526] rounded-md shadow-2xl w-[420px] overflow-hidden border border-[#3e3e42]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#3e3e42] bg-[#2d2d2d] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-yellow-400 flex items-center gap-1.5">
                <Replace size={14} /> Replace in Files
              </h3>
              <button onClick={() => setReplaceConfirmModal(null)} className="text-gray-400 hover:text-white"><X size={14} /></button>
            </div>
            <div className="p-4 text-gray-300 text-xs leading-relaxed space-y-3">
              <p>
                Replace <strong className="text-white font-mono bg-[#1e1e1e] px-1.5 py-0.5 rounded">"{replaceConfirmModal.q}"</strong> with <strong className="text-emerald-400 font-mono bg-[#1e1e1e] px-1.5 py-0.5 rounded">"{replaceConfirmModal.replaceWith}"</strong>?
              </p>
              <div className="p-2.5 bg-[#1e1e1e] rounded border border-[#3e3e42] text-[11px] text-gray-400">
                This will modify <span className="text-white font-semibold">{replaceConfirmModal.totalMatches}</span> occurrence(s) across <span className="text-white font-semibold">{replaceConfirmModal.totalFiles}</span> file(s). This action modifies files on disk.
              </div>
            </div>
            <div className="px-4 py-2.5 bg-[#1e1e1e] border-t border-[#3e3e42] flex justify-end gap-2">
              <button 
                onClick={executeReplaceAll}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
              >
                Replace All
              </button>
              <button 
                onClick={() => setReplaceConfirmModal(null)}
                className="px-3 py-1.5 bg-[#3e3e42] hover:bg-[#4a4a4d] text-white rounded text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explorer Context Menu */} 
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}></div>
          <div 
            className="fixed z-50 bg-[#252526] border border-[#3e3e42] shadow-2xl rounded py-1 min-w-[210px] text-xs text-[#cccccc]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.isDir ? (
              <>
                <button 
                  onClick={() => {
                    const dir = contextMenu.path;
                    setContextMenu(null);
                    setPromptModal({ type: 'file', targetDir: dir, onSubmit: async (name) => {
                      await apiFetch('/api/files/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: dir, name }) });
                      loadWorkspace();
                      openFile(dir === '/' ? `/${name}` : `${dir}/${name}`);
                    }});
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <FilePlus size={13} className="text-yellow-400" /> New File...
                </button>
                <button 
                  onClick={() => {
                    const dir = contextMenu.path;
                    setContextMenu(null);
                    setPromptModal({ type: 'folder', targetDir: dir, onSubmit: async (name) => {
                      await apiFetch('/api/files/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: dir, name }) });
                      loadWorkspace();
                    }});
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <FolderPlus size={13} className="text-blue-400" /> New Folder...
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => {
                    addTerminal(contextMenu.path);
                    setContextMenu(null);
                    setStatus(`Terminal opened in ${contextMenu.path.split('/').pop() || '/'}`);
                    setTimeout(() => setStatus(''), 2000);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <TerminalSquare size={13} className="text-green-400" /> Open in Integrated Terminal
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => { handleCut(contextMenu.path, true); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Scissors size={13} /> Cut
                </button>
                <button 
                  onClick={() => { handleCopy(contextMenu.path, true); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Copy size={13} /> Copy
                </button>
                <button 
                  disabled={!clipboard}
                  onClick={() => { handlePaste(contextMenu.path); setContextMenu(null); }}
                  className={`w-full text-left px-3.5 py-1.5 flex items-center gap-2 transition-colors ${
                    clipboard ? 'hover:bg-[#094771] hover:text-white text-gray-200' : 'text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Clipboard size={13} /> Paste
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => { copyPath(contextMenu.path); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
                >
                  Copy Path
                </button>
                <button 
                  onClick={() => { copyRelativePath(contextMenu.path); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
                >
                  Copy Relative Path
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => {
                    const name = contextMenu.path.split('/').pop() || '';
                    setContextMenu(null);
                    setRenameModal({ path: contextMenu.path, initialName: name });
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Edit2 size={13} /> Rename... (F2)
                </button>
                <button 
                  onClick={() => { handleDuplicate(contextMenu.path, true); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
                >
                  Duplicate
                </button>
                <button 
                  onClick={() => {
                    const name = contextMenu.path.split('/').pop() || '';
                    setContextMenu(null);
                    setDeleteModal({ path: contextMenu.path, name, isDir: true });
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 text-red-400"
                >
                  <Trash2 size={13} /> Delete (Del)
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => { loadWorkspace(); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
                <button 
                  onClick={() => {
                    store.openWindow({
                      appId: 'code',
                      title: 'NebuCode',
                      x: 120, y: 120,
                      width: 900, height: 600,
                      minWidth: 400, minHeight: 300,
                      minimized: false, maximized: false,
                      path: contextMenu.path
                    } as any, true);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
                >
                  Open in New Window
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { openFile(contextMenu.path); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <File size={13} /> Open
                </button>
                <button 
                  onClick={() => { openToSide(contextMenu.path); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Columns size={13} /> Open to the Side
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => { handleCut(contextMenu.path, false); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Scissors size={13} /> Cut
                </button>
                <button 
                  onClick={() => { handleCopy(contextMenu.path, false); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Copy size={13} /> Copy
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => { copyPath(contextMenu.path); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
                >
                  Copy Path
                </button>
                <button 
                  onClick={() => { copyRelativePath(contextMenu.path); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
                >
                  Copy Relative Path
                </button>

                <div className="border-t border-[#3e3e42] my-1"></div>

                <button 
                  onClick={() => {
                    const name = contextMenu.path.split('/').pop() || '';
                    setContextMenu(null);
                    setRenameModal({ path: contextMenu.path, initialName: name });
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Edit2 size={13} /> Rename... (F2)
                </button>
                <button 
                  onClick={() => { handleDuplicate(contextMenu.path, false); setContextMenu(null); }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
                >
                  Duplicate
                </button>
                <button 
                  onClick={() => {
                    const name = contextMenu.path.split('/').pop() || '';
                    setContextMenu(null);
                    setDeleteModal({ path: contextMenu.path, name, isDir: false });
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 text-red-400"
                >
                  <Trash2 size={13} /> Delete (Del)
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Tab Context Menu */}
      {tabContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTabContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setTabContextMenu(null); }}></div>
          <div 
            className="fixed z-50 bg-[#252526] border border-[#3e3e42] shadow-2xl rounded py-1 min-w-[190px] text-xs text-[#cccccc]"
            style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
          >
            <button 
              onClick={() => { closeFile(null, tabContextMenu.path); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex justify-between items-center"
            >
              <span>Close</span>
              <span className="text-[10px] text-gray-400">Ctrl+W</span>
            </button>
            <button 
              onClick={() => { closeOthers(tabContextMenu.path); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Close Others
            </button>
            <button 
              onClick={() => { closeTabsToRight(tabContextMenu.path); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Close to the Right
            </button>
            <button 
              onClick={() => { closeSaved(); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Close Saved
            </button>
            <button 
              onClick={() => { closeAll(); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Close All
            </button>

            <div className="border-t border-[#3e3e42] my-1"></div>

            <button 
              onClick={() => { openToSide(tabContextMenu.path); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors flex items-center gap-2"
            >
              <Columns size={13} /> Split Right
            </button>

            <div className="border-t border-[#3e3e42] my-1"></div>

            <button 
              onClick={() => { copyPath(tabContextMenu.path); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Copy Path
            </button>
            <button 
              onClick={() => { copyRelativePath(tabContextMenu.path); setTabContextMenu(null); }}
              className="w-full text-left px-3.5 py-1.5 hover:bg-[#094771] hover:text-white transition-colors"
            >
              Copy Relative Path
            </button>
          </div>
        </>
      )}

      {/* Git Diff Inspection Modal */}
      {diffModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6"
          onClick={() => setDiffModal(null)}
        >
          <div 
            className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-2.5 bg-[#252526] border-b border-[#333] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <GitBranch size={14} className="text-blue-400" />
                <span className="text-xs font-mono font-semibold text-gray-200">{diffModal.file}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  diffModal.staged ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {diffModal.staged ? 'Staged' : 'Working Tree'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {diffModal.staged ? (
                  <button
                    onClick={() => { handleGitUnstage(diffModal.file); setDiffModal(null); }}
                    className="px-2 py-1 text-xs bg-[#333] hover:bg-[#444] text-gray-200 rounded flex items-center gap-1"
                  >
                    <Minus size={12} /> Unstage
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { handleGitDiscard(diffModal.file); }}
                      className="px-2 py-1 text-xs bg-rose-950 hover:bg-rose-900 text-rose-300 rounded flex items-center gap-1 border border-rose-800"
                    >
                      <RotateCcw size={12} /> Discard
                    </button>
                    <button
                      onClick={() => { handleGitStage(diffModal.file); setDiffModal(null); }}
                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1"
                    >
                      <Plus size={12} /> Stage
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setDiffModal(null)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded ml-2"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body: Unified Diff Viewer */}
            <div className="flex-1 overflow-auto font-mono text-xs p-3 bg-[#181818] leading-relaxed">
              {diffModal.diff ? (
                diffModal.diff.split('\n').map((line, idx) => {
                  let lineClass = 'text-gray-400 py-0.5 px-2';
                  if (line.startsWith('+++') || line.startsWith('---')) {
                    lineClass = 'text-gray-400 font-bold bg-[#222] py-0.5 px-2';
                  } else if (line.startsWith('+')) {
                    lineClass = 'text-emerald-300 bg-emerald-950/40 border-l-2 border-emerald-500 py-0.5 px-2';
                  } else if (line.startsWith('-')) {
                    lineClass = 'text-rose-300 bg-rose-950/40 border-l-2 border-rose-500 py-0.5 px-2';
                  } else if (line.startsWith('@@')) {
                    lineClass = 'text-cyan-400 bg-cyan-950/30 font-bold py-0.5 px-2 my-0.5 rounded-xs';
                  }
                  return (
                    <div key={idx} className={`${lineClass} whitespace-pre`}>
                      {line}
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 text-center py-12">
                  No text diff available (empty file or binary content).
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}