import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Folder, File, Search, Trash2, FileText, 
  FolderPlus, FilePlus, Home, Code2, Image,
  ChevronLeft, ChevronRight, LayoutGrid, AlignJustify, FolderOpen,
  HardDrive, Presentation, Film, Music, Archive, Table2, Edit2, Copy, Download
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';

interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
}

interface ContextMenu {
  x: number; y: number;
  file: FileEntry;
  fullPath: string;
}

function getFileInfo(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (/^(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(ext))
    return { appId: 'image', icon: Image, color: 'text-pink-400', label: 'Image' };
  if (/^(md|txt|rtf|doc|docx|odt|pages)$/.test(ext))
    return { appId: 'docs', icon: FileText, color: 'text-blue-500', label: 'Document' };
  if (/^(csv|xlsx|xls|ods|numbers)$/.test(ext))
    return { appId: 'sheet', icon: Table2, color: 'text-green-500', label: 'Spreadsheet' };
  if (/^(ppt|pptx|odp|key)$/.test(ext))
    return { appId: 'slides', icon: Presentation, color: 'text-purple-500', label: 'Presentation' };
  if (/^(mp4|mov|avi|mkv|webm)$/.test(ext))
    return { appId: 'code', icon: Film, color: 'text-red-400', label: 'Video' };
  if (/^(mp3|flac|ogg|wav|aac)$/.test(ext))
    return { appId: 'code', icon: Music, color: 'text-yellow-500', label: 'Audio' };
  if (/^(zip|tar|gz|bz2|xz|7z|rar)$/.test(ext))
    return { appId: 'code', icon: Archive, color: 'text-orange-400', label: 'Archive' };
  if (/^(js|ts|jsx|tsx|py|sh|bash|json|yaml|yml|toml|xml|html|css|scss|go|rs|java|cpp|c|h|php|rb|lua|sql|env|conf|ini|log)$/.test(ext))
    return { appId: 'code', icon: Code2, color: 'text-emerald-500', label: 'Code' };
  return { appId: 'code', icon: File, color: 'text-gray-400', label: 'File' };
}

function formatSize(bytes: number) {
  if (bytes === 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesApp() {
  const [currentPath, setCurrentPath] = useState('/root');
  const [history, setHistory] = useState(['/root']);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const BASE = `http://${window.location.hostname}:3001`;

  const loadFiles = async (dir: string) => {
    try {
      const res = await fetch(`${BASE}/api/files?p=${encodeURIComponent(dir)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      setFiles(await res.json());
      setCurrentPath(dir);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { loadFiles(currentPath); }, []);

  // Close context menu on outside click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const navigate = (path: string) => {
    const newHistory = [...history.slice(0, historyIdx + 1), path];
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    loadFiles(path);
  };

  const goBack = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      loadFiles(prev);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      loadFiles(next);
    }
  };

  const openItem = (file: FileEntry) => {
    const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
    if (file.isDir) {
      navigate(fullPath);
    } else {
      const { appId } = getFileInfo(file.name);
      useWindowStore.getState().openWindow({
        appId,
        title: file.name,
        x: 180, y: 130, width: 860, height: 560,
        minWidth: 500, minHeight: 350,
        minimized: false, maximized: false,
        path: fullPath
      } as any, true);
    }
  };

  const handleDelete = async (name: string) => {
    const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`${BASE}/api/files?p=${encodeURIComponent(fullPath)}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) loadFiles(currentPath);
  };

  const handleCreateFolder = async () => {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    const res = await fetch(`${BASE}/api/files/folder`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: currentPath, name })
    });
    if (res.ok) loadFiles(currentPath);
  };

  const handleCreateFile = async () => {
    const name = prompt('File name:');
    if (!name?.trim()) return;
    const res = await fetch(`${BASE}/api/files/file`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: currentPath, name })
    });
    if (res.ok) loadFiles(currentPath);
  };

  const handleRename = async () => {
    if (!renaming || !renameVal.trim() || renameVal === renaming) { setRenaming(null); return; }
    const oldPath = currentPath === '/' ? `/${renaming}` : `${currentPath}/${renaming}`;
    const newPath = currentPath === '/' ? `/${renameVal}` : `${currentPath}/${renameVal}`;
    const res = await fetch(`${BASE}/api/files/rename`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath })
    });
    if (res.ok) loadFiles(currentPath);
    setRenaming(null);
  };

  const handleCopy = (fullPath: string) => {
    navigator.clipboard.writeText(fullPath);
  };

  const handleDownload = (fullPath: string, name: string) => {
    const a = document.createElement('a');
    a.href = `${BASE}/api/files/download?p=${encodeURIComponent(fullPath)}`;
    a.download = name;
    a.click();
  };

  const filteredFiles = useMemo(() =>
    files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [files, searchQuery]);

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="h-full flex flex-col bg-[#f9f9f9] text-gray-800 text-sm" ref={containerRef}>
      {/* Toolbar */}
      <div className="h-14 bg-gradient-to-b from-gray-50 to-gray-100/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center px-4 shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        
        {/* Nav */}
        <div className="flex items-center space-x-1 mr-3 shrink-0">
          <button onClick={goBack} disabled={historyIdx === 0} className="p-1 rounded-md hover:bg-gray-200/80 transition-colors text-gray-600 disabled:opacity-30"><ChevronLeft size={18} /></button>
          <button onClick={goForward} disabled={historyIdx >= history.length - 1} className="p-1 rounded-md hover:bg-gray-200/80 transition-colors text-gray-600 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center space-x-1 flex-1 min-w-0 text-xs text-gray-600">
          <button onClick={() => navigate('/root')} className="hover:text-blue-500 flex items-center shrink-0 nebudesk-no-drag">
            <Home size={14} />
          </button>
          {breadcrumbs.map((seg, i) => {
            const path = '/' + breadcrumbs.slice(0, i + 1).join('/');
            return (
              <span key={i} className="flex items-center shrink-0 nebudesk-no-drag">
                <span className="text-gray-400 mx-1">/</span>
                <button onClick={() => navigate(path)} className="hover:text-blue-500 truncate max-w-[100px]">{seg}</button>
              </span>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center bg-gray-200/60 rounded-md px-2 py-1 nebudesk-no-drag mr-2">
          <Search size={13} className="text-gray-400 mr-1" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search" className="bg-transparent text-xs focus:outline-none w-24" />
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-200/60 rounded-md p-0.5 nebudesk-no-drag mr-2">
          <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}><AlignJustify size={14} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}><LayoutGrid size={14} /></button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 nebudesk-no-drag">
          <button onClick={handleCreateFolder} className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-600 transition-colors" title="New Folder"><FolderPlus size={16} /></button>
          <button onClick={handleCreateFile} className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-600 transition-colors" title="New File"><FilePlus size={16} /></button>
        </div>
      </div>

      {error && <div className="px-4 py-2 text-red-500 bg-red-50 text-xs border-b border-red-100">{error}</div>}

      {/* Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-gray-50/80 backdrop-blur-md border-r border-gray-200 flex flex-col pt-3 pb-2 select-none overflow-y-auto">
          <div className="px-4 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Favorites</div>
          <button onClick={() => navigate('/root')} className={`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors ${currentPath === '/root' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}`}>
            <Home size={16} className={`mr-2 ${currentPath === '/root' ? 'text-white' : 'text-blue-500'}`} /> <span className="truncate">Home</span>
          </button>
          <button onClick={() => navigate('/root/Documents')} className={`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors mt-0.5 ${currentPath === '/root/Documents' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}`}>
            <FileText size={16} className={`mr-2 ${currentPath === '/root/Documents' ? 'text-white' : 'text-blue-500'}`} /> <span className="truncate">Documents</span>
          </button>
          <button onClick={() => navigate('/root/Downloads')} className={`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors mt-0.5 ${currentPath === '/root/Downloads' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}`}>
            <Folder size={16} className={`mr-2 ${currentPath === '/root/Downloads' ? 'text-white' : 'text-blue-500'}`} /> <span className="truncate">Downloads</span>
          </button>
          
          <div className="px-4 mt-4 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Locations</div>
          <button onClick={() => navigate('/')} className={`flex items-center px-4 py-1.5 mx-2 rounded-md text-sm transition-colors ${currentPath === '/' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200/50'}`}>
            <HardDrive size={16} className={`mr-2 ${currentPath === '/' ? 'text-white' : 'text-gray-500'}`} /> <span className="truncate">Root</span>
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-auto p-4 bg-white">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <Folder size={64} className="text-gray-200" strokeWidth={1} />
            <p>Empty folder</p>
          </div>
        ) : viewMode === 'list' ? (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-200 text-xs uppercase tracking-wide">
                <th className="pb-2 font-medium pl-2">Name</th>
                <th className="pb-2 font-medium w-28">Kind</th>
                <th className="pb-2 font-medium w-24 text-right">Size</th>
                <th className="pb-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map(file => {
                const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                const info = file.isDir ? null : getFileInfo(file.name);
                const Icon = info ? info.icon : Folder;
                return (
                  <tr
                    key={file.name}
                    onDoubleClick={() => openItem(file)}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file, fullPath }); }}
                    className="border-b border-gray-100 hover:bg-blue-50/60 group cursor-default transition-colors"
                  >
                    <td className="py-1.5 flex items-center space-x-2 pl-2">
                      <Icon size={18} strokeWidth={1.5} className={file.isDir ? 'text-blue-400 fill-blue-100' : (info?.color || 'text-gray-400')} />
                      {renaming === file.name ? (
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={handleRename}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(null); }}
                          className="border border-blue-400 rounded px-1 text-sm focus:outline-none w-40"
                        />
                      ) : (
                        <span className="truncate max-w-xs">{file.name}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-gray-400 text-xs">{file.isDir ? 'Folder' : info?.label}</td>
                    <td className="py-1.5 text-gray-400 text-xs text-right">{file.isDir ? '--' : formatSize(file.size)}</td>
                    <td className="py-1.5 text-right pr-2">
                      <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end space-x-1 transition-opacity">
                        {!file.isDir && (
                          <button onClick={() => openItem(file)} className="p-1 rounded hover:bg-blue-100 text-blue-500" title="Open"><FolderOpen size={13} /></button>
                        )}
                        <button onClick={e => { e.stopPropagation(); setRenaming(file.name); setRenameVal(file.name); }} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Rename"><Edit2 size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(file.name); }} className="p-1 rounded hover:bg-red-50 text-red-400" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filteredFiles.map(file => {
              const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
              const info = file.isDir ? null : getFileInfo(file.name);
              const Icon = info ? info.icon : Folder;
              return (
                <div
                  key={file.name}
                  onDoubleClick={() => openItem(file)}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file, fullPath }); }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-blue-50 group cursor-default text-center transition-colors relative select-none"
                >
                  <Icon size={44} strokeWidth={1.2} className={`mb-2 ${file.isDir ? 'text-blue-400' : (info?.color || 'text-gray-400')}`} />
                  <span className="text-xs text-gray-700 truncate w-full px-1">{file.name}</span>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex space-x-0.5 transition-opacity">
                    {!file.isDir && (
                      <button onClick={e => { e.stopPropagation(); openItem(file); }} className="p-1 rounded-full bg-white shadow-sm text-blue-500 hover:bg-blue-50" title="Open"><FolderOpen size={10} /></button>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDelete(file.name); }} className="p-1 rounded-full bg-white shadow-sm text-red-400 hover:bg-red-50" title="Delete"><Trash2 size={10} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white/90 backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl py-1.5 min-w-[180px] text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {!contextMenu.file.isDir && (
            <>
              <button onClick={() => { openItem(contextMenu.file); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                <FolderOpen size={14} className="text-blue-500" /><span>Open</span>
              </button>
              <button onClick={() => { openItem({ ...contextMenu.file, name: contextMenu.file.name }); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                <Code2 size={14} className="text-gray-500" /><span>Open in NebuCode</span>
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button onClick={() => { handleDownload(contextMenu.fullPath, contextMenu.file.name); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                <Download size={14} className="text-gray-500" /><span>Download</span>
              </button>
            </>
          )}
          {contextMenu.file.isDir && (
            <button onClick={() => { navigate(contextMenu.fullPath); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
              <FolderOpen size={14} className="text-blue-500" /><span>Open Folder</span>
            </button>
          )}
          <button onClick={() => { handleCopy(contextMenu.fullPath); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
            <Copy size={14} className="text-gray-500" /><span>Copy Path</span>
          </button>
          <button onClick={() => { setRenaming(contextMenu.file.name); setRenameVal(contextMenu.file.name); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
            <Edit2 size={14} className="text-gray-500" /><span>Rename</span>
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button onClick={() => { handleDelete(contextMenu.file.name); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-red-50 text-red-500 flex items-center space-x-2">
            <Trash2 size={14} /><span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
