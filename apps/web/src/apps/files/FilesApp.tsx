import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Folder, File, Search, Trash2, FileText, 
  FolderPlus, FilePlus, Home, Code2, Image as ImageIcon,
  ChevronLeft, ChevronRight, LayoutGrid, FolderOpen,
  Presentation, Film, Music, Archive, Table2, Edit2, Copy, Download,
  Monitor, List, Upload, RefreshCw
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { getCachedHomeDir } from '../../config/api';

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

export function getFileInfo(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (/^(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(ext))
    return { appId: 'image', icon: ImageIcon, color: 'text-pink-400', label: 'Image' };
  if (/^(md|txt|rtf|doc|docx|odt|pages)$/.test(ext))
    return { appId: 'docs', icon: FileText, color: 'text-blue-500', label: 'Document' };
  if (/^(csv|xlsx|xls|ods|numbers)$/.test(ext))
    return { appId: 'sheet', icon: Table2, color: 'text-green-500', label: 'Spreadsheet' };
  if (/^(ppt|pptx|odp|key)$/.test(ext))
    return { appId: 'slides', icon: Presentation, color: 'text-purple-500', label: 'Presentation' };
  if (/^(mp4|mov|avi|mkv|webm|ogv)$/.test(ext))
    return { appId: 'image', icon: Film, color: 'text-purple-400', label: 'Video' };
  if (/^(mp3|flac|ogg|wav|aac|m4a)$/.test(ext))
    return { appId: 'image', icon: Music, color: 'text-yellow-500', label: 'Audio' };
  if (/^(zip|tar|gz|bz2|xz|7z|rar)$/.test(ext))
    return { appId: 'code', icon: Archive, color: 'text-orange-400', label: 'Archive' };
  if (/^(js|ts|jsx|tsx|py|sh|bash|json|yaml|yml|toml|xml|html|css|scss|go|rs|java|cpp|c|h|php|rb|lua|sql|env|conf|ini|log)$/.test(ext))
    return { appId: 'code', icon: Code2, color: 'text-emerald-500', label: 'Code' };
  return { appId: 'code', icon: File, color: 'text-gray-400', label: 'File' };
}

export function formatSize(bytes: number) {
  if (bytes === 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const FolderIcon = ({ children }: { children?: React.ReactNode }) => (
  <div className="relative w-14 h-12 flex flex-col items-center justify-center">
    <svg viewBox="0 0 100 80" className="w-14 h-14 text-[#3b82f6] drop-shadow-sm">
      <path
        d="M5,15 L35,15 L45,25 L95,25 C97.7614237,25 100,27.2385763 100,30 L100,75 C100,77.7614237 97.7614237,80 95,80 L5,80 C2.23857625,80 0,77.7614237 0,75 L0,20 C0,17.2385763 2.23857625,15 5,15 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M5,15 L35,15 L45,25 L95,25 C97.7614237,25 100,27.2385763 100,30 L100,35 L0,35 L0,20 C0,17.2385763 2.23857625,15 5,15 Z"
        fill="white"
        opacity="0.2"
      />
    </svg>
    {children}
  </div>
);

export default function FilesApp({ initialPath }: { initialPath?: string }) {
  const homePath = getCachedHomeDir();
  const startPath = initialPath || homePath;
  const [currentPath, setCurrentPath] = useState(startPath);
  const [history, setHistory] = useState([startPath]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [promptModal, setPromptModal] = useState<{type: 'folder' | 'file', onSubmit: (name: string) => void} | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const BASE = `http://${window.location.hostname}:3030`;

  const loadFiles = async (dir: string) => {
    try {
      const res = await fetch(`${BASE}/api/files?p=${encodeURIComponent(dir)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      setFiles(await res.json());
      setCurrentPath(dir);
      setSelectedFile(null);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { loadFiles(currentPath); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (renaming || promptModal) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (selectedFile) {
        const file = filteredFiles.find(f => f.name === selectedFile);
        if (file && !file.isDir) {
          const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
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
      }
      return;
    }

    if (e.key === 'Enter') {
      if (selectedFile) {
        const file = filteredFiles.find(f => f.name === selectedFile);
        if (file) openItem(file);
      }
      return;
    }

    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      if (filteredFiles.length === 0) return;
      const currentIndex = filteredFiles.findIndex(f => f.name === selectedFile);
      let nextIndex = 0;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = currentIndex === -1 ? 0 : Math.min(filteredFiles.length - 1, currentIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex === -1 ? filteredFiles.length - 1 : Math.max(0, currentIndex - 1);
      }
      const nextFile = filteredFiles[nextIndex];
      if (nextFile) {
        setSelectedFile(nextFile.name);
      }
      return;
    }
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, file: FileEntry, fullPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const localX = rect ? e.clientX - rect.left : e.clientX;
    const localY = rect ? e.clientY - rect.top : e.clientY;
    const contW = rect ? rect.width : window.innerWidth;
    const contH = rect ? rect.height : window.innerHeight;
    
    const estimatedHeight = 260;
    const maxX = Math.max(8, contW - 200);
    let yPos = localY;
    if (localY + estimatedHeight > contH - 10) {
      if (localY - estimatedHeight >= 10) {
        yPos = localY - estimatedHeight;
      } else {
        yPos = Math.max(8, contH - estimatedHeight - 10);
      }
    }
    const clampedX = Math.min(Math.max(8, localX), maxX);
    const clampedY = Math.max(8, yPos);
    setContextMenu({ x: clampedX, y: clampedY, file, fullPath });
  };

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

  const handleCreateFolder = () => {
    setPromptModal({
      type: 'folder',
      onSubmit: async (name) => {
        if (!name?.trim()) return;
        const res = await fetch(`${BASE}/api/files/folder`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: currentPath, name })
        });
        if (res.ok) loadFiles(currentPath);
      }
    });
  };

  const handleCreateFile = () => {
    setPromptModal({
      type: 'file',
      onSubmit: async (name) => {
        if (!name?.trim()) return;
        const res = await fetch(`${BASE}/api/files/file`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p: currentPath, name, content: '' })
        });
        if (res.ok) loadFiles(currentPath);
      }
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('p', currentPath);
    formData.append('file', file);
    
    try {
      const res = await fetch(`${BASE}/api/files/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Upload failed');
      } else {
        loadFiles(currentPath);
      }
    } catch (err: any) {
      setError(err.message);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const SidebarItem = ({ icon: Icon, label, path, isActive }: any) => (
    <button
      onPointerDown={(e) => { e.stopPropagation(); navigate(path); }}
      className={`w-[calc(100%-16px)] flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-pointer select-none text-sm transition-colors text-left
        ${isActive ? 'bg-[#dcdcdc] font-medium text-gray-900' : 'hover:bg-gray-200 text-gray-700'}`}
    >
      <Icon size={16} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-blue-400'}`} />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div 
      className="h-full flex flex-row bg-white text-gray-800 font-sans select-none relative focus:outline-none" 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      
    <div className="w-56 bg-[#f3f3f3] flex-shrink-0 flex flex-col border-r border-transparent nebudesk-drag-region touch-none select-none h-full relative z-10">
      <div className="h-14 shrink-0 pointer-events-none border-b border-transparent"></div>
      
      <div className="flex-1 overflow-y-auto py-2 space-y-1 nebudesk-no-drag">

            <div className="mt-2 mb-1 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Favorit</div>
            <SidebarItem icon={Home} label="Home" path={homePath} isActive={currentPath === homePath} />
            <SidebarItem icon={Monitor} label="NebuDesk" path={`${homePath}/nebudesk`} isActive={currentPath === `${homePath}/nebudesk`} />
          
      </div>
    </div>


    {/* Right Main Area */}
    <div className="flex-1 flex flex-col overflow-hidden h-full z-0 bg-white">
      {/* Toolbar */}
      <div className="h-14 flex items-center px-4 sm:px-6 border-b border-transparent bg-white shrink-0 nebudesk-drag-region touch-none w-full overflow-hidden">
        {/* Left Nav & Title */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex gap-1 text-gray-500 nebudesk-no-drag">
            <button onClick={goBack} disabled={historyIdx === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronLeft size={20} /></button>
            <button onClick={goForward} disabled={historyIdx >= history.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>
          <h1 className="font-semibold text-gray-800 text-sm truncate max-w-[80px] sm:max-w-[200px]">{currentPath === homePath ? 'Home' : (currentPath.split('/').pop() || 'Home')}</h1>
        </div>

        {/* 3. Flexible Spacer */}
        <div className="flex-1 min-w-[10px]" />

        {/* 4. Right Controls */}
        <div className="flex items-center gap-1 sm:gap-3 nebudesk-no-drag overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0 max-w-[50%] sm:max-w-none">
          {/* View Toggle */}
          <div className="flex items-center bg-[#f3f3f3] rounded-md border border-gray-200 p-0.5 shrink-0">
            <button onClick={() => setViewMode('grid')} className={`p-1 px-1.5 sm:px-2 rounded-md transition-colors ${viewMode === 'grid' ? 'text-gray-800 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1 px-1.5 sm:px-2 rounded-md transition-colors ${viewMode === 'list' ? 'text-gray-800 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><List size={16} /></button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 text-gray-500 shrink-0">
            <button onClick={handleCreateFolder} className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-md" title="New Folder"><FolderPlus size={18} /></button>
            <button onClick={handleCreateFile} className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-md" title="New File"><FilePlus size={18} /></button>
            <button onClick={handleUploadClick} className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-md" title="Upload File"><Upload size={18} /></button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button 
              onClick={() => loadFiles(currentPath)} 
              className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-700 transition-colors" 
              title="Reload Folder"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="relative flex items-center shrink-0">
            <Search size={14} className="absolute left-2 text-gray-400" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              type="text" 
              placeholder="Search"
              className="pl-7 pr-3 py-1 w-20 sm:w-24 bg-[#f3f3f3] border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all focus:w-32 sm:focus:w-40"
            />
          </div>
        </div>
      </div>

      {error && <div className="px-4 py-2 text-red-500 bg-red-50 text-xs border-b border-red-100">{error}</div>}
        <div 
          className="flex-1 overflow-auto p-4 bg-white relative" 
          onClick={() => { setRenaming(null); setSelectedFile(null); }}
        >
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 select-none">
              <FolderIcon />
              <p className="text-sm font-medium text-gray-500">Folder ini kosong</p>
              <p className="text-xs text-gray-400">Gunakan tombol di atas untuk membuat berkas atau folder baru.</p>
            </div>
          ) : viewMode === 'list' ? (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 text-xs uppercase tracking-wide">
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
                  const isSelected = selectedFile === file.name;
                  return (
                    <tr
                      key={file.name}
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(file.name); }}
                      onDoubleClick={(e) => { e.stopPropagation(); openItem(file); }}
                      onContextMenu={e => { setSelectedFile(file.name); handleContextMenu(e, file, fullPath); }}
                      className={`border-b border-gray-50 select-none group cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-500/15 font-medium' : 'hover:bg-blue-50/50'
                      }`}
                    >
                      <td className="py-2 flex items-center space-x-3 pl-2">
                        {file.isDir ? (
                          <div className="scale-[0.5] -m-3 origin-left"><FolderIcon /></div>
                        ) : (
                          <Icon size={20} strokeWidth={1.5} className={info?.color || 'text-gray-400'} />
                        )}
                        {renaming === file.name ? (
                          <input
                            autoFocus
                            value={renameVal}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setRenameVal(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(null); }}
                            className="border border-blue-400 rounded px-1 text-sm focus:outline-none w-40"
                          />
                        ) : (
                          <span className="truncate max-w-xs">{file.name}</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-500 text-xs">{file.isDir ? 'Folder' : info?.label}</td>
                      <td className="py-2 text-gray-500 text-xs text-right">{file.isDir ? '--' : formatSize(file.size)}</td>
                      <td className="py-2 text-right pr-2">
                        <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end space-x-1 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); setRenaming(file.name); setRenameVal(file.name); }} className="p-1 rounded hover:bg-gray-200 text-gray-500" title="Rename"><Edit2 size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(file.name); }} className="p-1 rounded hover:bg-red-100 text-red-500" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-x-2 gap-y-6 content-start pt-2 justify-items-center">
              {filteredFiles.map(file => {
                const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                const info = file.isDir ? null : getFileInfo(file.name);
                const Icon = info ? info.icon : Folder;
                const isSelected = selectedFile === file.name;
                const isImage = !file.isDir && /^(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name.split('.').pop() || '');
                return (
                  <div
                    key={file.name}
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(file.name); }}
                    onDoubleClick={(e) => { e.stopPropagation(); openItem(file); }}
                    onContextMenu={e => { setSelectedFile(file.name); handleContextMenu(e, file, fullPath); }}
                    className={`flex flex-col items-center gap-1 group cursor-pointer relative p-1.5 rounded-lg transition-all ${
                      isSelected ? 'bg-blue-500/15 ring-2 ring-blue-500' : 'hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="w-16 h-16 flex items-center justify-center relative">
                      {file.isDir ? (
                        <FolderIcon />
                      ) : isImage ? (
                        <div className="w-14 h-16 rounded-md shadow-sm overflow-hidden border border-gray-200/60 bg-gray-100 flex items-center justify-center relative">
                          <img 
                            src={`${BASE}/api/files/download?p=${encodeURIComponent(fullPath)}`} 
                            alt={file.name} 
                            className="w-full h-full object-cover" 
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 -z-10 flex items-center justify-center">
                            <Icon size={28} strokeWidth={1} className={info?.color || 'text-gray-400'} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-16 rounded-md shadow-sm overflow-hidden border border-gray-200/50 bg-gray-50 flex items-center justify-center">
                          <Icon size={32} strokeWidth={1} className={info?.color || 'text-gray-400'} />
                        </div>
                      )}
                    </div>
                    {renaming === file.name ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(null); }}
                        className="border border-blue-400 rounded px-1 text-xs text-center focus:outline-none w-20 z-10"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className={`text-xs text-center max-w-[84px] truncate px-1.5 py-0.5 rounded transition-colors ${
                          isSelected ? 'bg-blue-600 text-white font-medium shadow-xs' : 'text-gray-800 group-hover:bg-blue-500/10'
                        }`}>
                          {file.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
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

      {contextMenu && (
        <>
          <div
            className="absolute inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="absolute z-50 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl py-1.5 min-w-[180px] max-h-[calc(100%-20px)] overflow-y-auto [scrollbar-width:thin] text-sm"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            {!contextMenu.file.isDir && (
              <>
                <button onClick={() => { openItem(contextMenu.file); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                  <FolderOpen size={14} className="text-blue-500" /><span>Open</span>
                </button>
                {/^(jpg|jpeg|png|gif|webp|svg|bmp|ico|mp4|mov|avi|mkv|webm|ogv|mp3|flac|ogg|wav|aac|m4a)$/i.test(contextMenu.file.name.split('.').pop() || '') && (
                  <button onClick={() => { 
                    useWindowStore.getState().openWindow({
                      appId: 'image', title: contextMenu.file.name,
                      x: 180, y: 130, width: 860, height: 560,
                      minWidth: 500, minHeight: 350, minimized: false, maximized: false,
                      path: contextMenu.fullPath
                    } as any, true);
                    setContextMenu(null); 
                  }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                    <ImageIcon size={14} className="text-pink-500" /><span>Open in Media Viewer</span>
                  </button>
                )}
                <button onClick={() => { 
                  useWindowStore.getState().openWindow({
                    appId: 'code', title: 'NebuCode',
                    x: 150, y: 150, width: 900, height: 600,
                    minWidth: 500, minHeight: 350, minimized: false, maximized: false,
                    path: contextMenu.fullPath
                  } as any, true);
                  setContextMenu(null); 
                }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                  <Code2 size={14} className="text-gray-500" /><span>Open in NebuCode</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={() => { handleDownload(contextMenu.fullPath, contextMenu.file.name); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                  <Download size={14} className="text-gray-500" /><span>Download</span>
                </button>
              </>
            )}
            {contextMenu.file.isDir && (
              <>
                <button onClick={() => { navigate(contextMenu.fullPath); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                  <FolderOpen size={14} className="text-blue-500" /><span>Open Folder</span>
                </button>
                <button onClick={() => { 
                  useWindowStore.getState().openWindow({
                    appId: 'code', title: 'NebuCode',
                    x: 150, y: 150, width: 800, height: 600,
                    minWidth: 600, minHeight: 400, minimized: false, maximized: false,
                    path: contextMenu.fullPath
                  } as any, true);
                  setContextMenu(null); 
                }} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2">
                  <Code2 size={14} className="text-gray-500" /><span>Open in NebuCode</span>
                </button>
              </>
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
        </>
      )}
    </div>
  );
}
