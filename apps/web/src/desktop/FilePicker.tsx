import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Folder, File, ChevronLeft, ChevronRight, ChevronUp, RotateCw, 
  Search, X, Check, Eye, EyeOff, Edit3, ArrowUp, ArrowDown 
} from 'lucide-react';
import { apiJson } from '../config/api';
import { getFileInfo, formatSize } from '../apps/files/FilesApp';

export interface FilePickerProps {
  onSelect: (path: string) => void;
  onCancel: () => void;
  initialPath?: string;
  mode?: 'file' | 'folder';
  winId?: string;
}

interface FileItem {
  name: string;
  isDir: boolean;
  size: number;
}

type SortField = 'name' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';
type FileFilter = 'all' | 'code' | 'docs' | 'media';

const CODE_EXTS = /\.(ts|tsx|js|jsx|json|py|rs|go|sh|bash|html|css|scss|php|c|cpp|h|yml|yaml|toml|sql|md|env|conf|ini|log)$/i;
const DOCS_EXTS = /\.(md|txt|doc|docx|rtf|pdf|pages|odt|csv|tsv|xls|xlsx)$/i;
const MEDIA_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico|mp4|mov|webm|mp3|wav|flac|ogg)$/i;

export default function FilePicker({ 
  onSelect, 
  onCancel, 
  initialPath = '/root',
  mode = 'folder'
}: FilePickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '/root');
  const [history, setHistory] = useState<string[]>([initialPath || '/root']);
  const [historyIdx, setHistoryIdx] = useState<number>(0);
  
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selection
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Sorting & Filtering
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showHidden, setShowHidden] = useState(false);
  const [fileFilter, setFileFilter] = useState<FileFilter>('all');

  // Breadcrumb vs direct path input
  const [editingPath, setEditingPath] = useState(false);
  const [pathInputVal, setPathInputVal] = useState(currentPath);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus container on mount for immediate keyboard navigation
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Fetch directory contents
  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError('');
    setSelectedIndex(-1);
    setSelectedItem(null);
    try {
      const data = await apiJson<FileItem[]>(`/api/files?p=${encodeURIComponent(dirPath)}`);
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load directory';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPathInputVal(currentPath);
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute filename search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    apiJson<{ results: string[] }>(`/api/files/search?p=${encodeURIComponent(currentPath)}&q=${encodeURIComponent(debouncedQuery)}`)
      .then(data => {
        if (!active) return;
        if (data && Array.isArray(data.results)) {
          const mapped: FileItem[] = data.results.map(rel => {
            const isDir = rel.endsWith('/');
            const cleanName = rel.replace(/\/$/, '');
            return {
              name: cleanName,
              isDir,
              size: 0
            };
          });
          setSearchResults(mapped);
        } else {
          setSearchResults([]);
        }
      })
      .catch(() => {
        if (active) setSearchResults([]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => { active = false; };
  }, [debouncedQuery, currentPath]);

  // Navigation handlers
  const navigateTo = (newPath: string) => {
    const clean = newPath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    const newHistory = [...history.slice(0, historyIdx + 1), clean];
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    setCurrentPath(clean);
    setSearchQuery('');
  };

  const goBack = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      setCurrentPath(prev);
      setSearchQuery('');
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      setCurrentPath(next);
      setSearchQuery('');
    }
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
    navigateTo(parentPath);
  };

  const handleCommitPathInput = () => {
    let target = pathInputVal.trim();
    if (!target) target = '/root';
    if (!target.startsWith('/')) target = '/' + target;
    setEditingPath(false);
    navigateTo(target);
  };

  // Process and filter displayed items
  const isSearchActive = debouncedQuery.length >= 2;

  const displayedItems = useMemo(() => {
    const sourceList = isSearchActive ? searchResults : items;
    let list = [...sourceList];

    // Filter hidden files
    if (!showHidden) {
      list = list.filter(item => {
        const basename = item.name.split('/').pop() || item.name;
        return !basename.startsWith('.');
      });
    }

    // In folder mode, only display folders if not searching
    if (mode === 'folder' && !isSearchActive) {
      list = list.filter(item => item.isDir);
    }

    // Filter by file type in file mode
    if (mode === 'file' && !isSearchActive && fileFilter !== 'all') {
      list = list.filter(item => {
        if (item.isDir) return true; // keep folders accessible
        if (fileFilter === 'code') return CODE_EXTS.test(item.name);
        if (fileFilter === 'docs') return DOCS_EXTS.test(item.name);
        if (fileFilter === 'media') return MEDIA_EXTS.test(item.name);
        return true;
      });
    }

    // Sort items
    list.sort((a, b) => {
      // Directories always on top
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;

      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'size') {
        comparison = a.size - b.size;
      } else if (sortField === 'type') {
        const extA = a.name.split('.').pop() || '';
        const extB = b.name.split('.').pop() || '';
        comparison = extA.localeCompare(extB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [items, searchResults, isSearchActive, showHidden, mode, fileFilter, sortField, sortOrder]);

  // Keep selected item within bounds
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < displayedItems.length) {
      setSelectedItem(displayedItems[selectedIndex]);
    } else {
      setSelectedItem(null);
    }
  }, [selectedIndex, displayedItems]);

  // Confirm selection
  const handleConfirm = () => {
    if (mode === 'folder') {
      if (selectedItem && selectedItem.isDir) {
        const full = currentPath === '/' ? `/${selectedItem.name}` : `${currentPath}/${selectedItem.name}`;
        onSelect(full);
      } else {
        onSelect(currentPath);
      }
    } else if (mode === 'file') {
      if (!selectedItem || selectedItem.isDir) return;
      const full = isSearchActive
        ? (selectedItem.name.startsWith('/') ? selectedItem.name : `${currentPath}/${selectedItem.name}`)
        : (currentPath === '/' ? `/${selectedItem.name}` : `${currentPath}/${selectedItem.name}`);
      onSelect(full);
    }
  };

  const handleItemClick = (idx: number, item: FileItem) => {
    setSelectedIndex(idx);
    setSelectedItem(item);
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.isDir) {
      const target = isSearchActive
        ? (item.name.startsWith('/') ? item.name : `${currentPath}/${item.name}`)
        : (currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`);
      navigateTo(target);
    } else if (mode === 'file') {
      const full = isSearchActive
        ? (item.name.startsWith('/') ? item.name : `${currentPath}/${item.name}`)
        : (currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`);
      onSelect(full);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    const isTyping = targetTag === 'input' || targetTag === 'textarea';

    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingPath) {
        handleCommitPathInput();
        return;
      }
      if (selectedItem?.isDir) {
        handleItemDoubleClick(selectedItem);
      } else if (selectedItem && mode === 'file') {
        handleConfirm();
      } else if (mode === 'folder') {
        handleConfirm();
      }
      return;
    }

    if (!isTyping) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = Math.min(displayedItems.length - 1, prev + 1);
          scrollItemIntoView(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = Math.max(0, prev - 1);
          scrollItemIntoView(next);
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSelectedIndex(0);
        scrollItemIntoView(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = displayedItems.length - 1;
        setSelectedIndex(last);
        scrollItemIntoView(last);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        navigateUp();
      }
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  const scrollItemIntoView = (idx: number) => {
    if (!listRef.current) return;
    const rows = listRef.current.querySelectorAll('[data-row-index]');
    const target = rows[idx] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  };

  // Parse path segments for breadcrumbs
  const pathSegments = useMemo(() => {
    if (currentPath === '/') return [];
    return currentPath.split('/').filter(Boolean);
  }, [currentPath]);

  const handleBreadcrumbClick = (idx: number) => {
    const target = '/' + pathSegments.slice(0, idx + 1).join('/');
    navigateTo(target);
  };

  // Sort toggle helper
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Large directory rendering: slice to first 200 items for smooth 60fps rendering
  const maxRenderCount = 200;
  const renderedItems = displayedItems.slice(0, maxRenderCount);
  const remainingCount = displayedItems.length - maxRenderCount;

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full flex flex-col bg-white dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-200 outline-none select-none font-sans"
    >
      {/* 1. macOS Titlebar (Drag Region) */}
      <div className="h-14 border-b border-gray-200 dark:border-[#333] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#252526] dark:to-[#1e1e1e] flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0"></div>
        <div className="flex-1 text-center font-medium text-sm text-gray-800 dark:text-gray-200 pr-[90px] truncate">
          {mode === 'folder' ? 'Open Folder' : 'Open File'}
        </div>
      </div>

      {/* 2. Primary Navigation & Search Toolbar */}
      <div className="h-11 border-b border-gray-200 dark:border-[#333] bg-gray-50/90 dark:bg-[#252526]/90 px-3 flex items-center space-x-2 shrink-0">
        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1">
          <button 
            onClick={goBack} 
            disabled={historyIdx <= 0}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 dark:text-gray-400 transition-colors"
            title="Back"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={goForward} 
            disabled={historyIdx >= history.length - 1}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 dark:text-gray-400 transition-colors"
            title="Forward"
          >
            <ChevronRight size={16} />
          </button>
          <button 
            onClick={navigateUp} 
            disabled={currentPath === '/'}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 dark:text-gray-400 transition-colors"
            title="Up to Parent Directory"
          >
            <ChevronUp size={16} />
          </button>
          <button 
            onClick={() => loadDirectory(currentPath)}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-[#333] text-gray-600 dark:text-gray-400 transition-colors"
            title="Refresh Directory"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="h-4 w-px bg-gray-300 dark:bg-[#444] mx-1"></div>

        {/* Interactive Breadcrumb Bar or Manual Path Input */}
        <div className="flex-1 flex items-center min-w-0 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#444] rounded px-2 py-1 text-xs">
          {editingPath ? (
            <input 
              type="text" 
              autoFocus
              value={pathInputVal}
              onChange={e => setPathInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCommitPathInput();
                if (e.key === 'Escape') setEditingPath(false);
              }}
              onBlur={handleCommitPathInput}
              className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-gray-800 dark:text-gray-100"
              placeholder="/path/to/directory"
            />
          ) : (
            <div className="flex-1 flex items-center space-x-1 overflow-x-auto scrollbar-none">
              <button 
                onClick={() => navigateTo('/')}
                className={`hover:bg-gray-100 dark:hover:bg-[#333] px-1.5 py-0.5 rounded font-mono text-xs ${currentPath === '/' ? 'font-bold text-blue-500' : 'text-gray-600 dark:text-gray-400'}`}
              >
                /
              </button>
              {pathSegments.map((segment, idx) => (
                <div key={idx} className="flex items-center space-x-1 shrink-0">
                  <span className="text-gray-400 select-none">/</span>
                  <button 
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`hover:bg-gray-100 dark:hover:bg-[#333] px-1.5 py-0.5 rounded text-xs truncate max-w-[120px] ${idx === pathSegments.length - 1 ? 'font-semibold text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {segment}
                  </button>
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={() => { setPathInputVal(currentPath); setEditingPath(prev => !prev); }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-[#333] rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-1 shrink-0"
            title={editingPath ? 'Switch to Breadcrumbs' : 'Edit Path Manually'}
          >
            <Edit3 size={12} />
          </button>
        </div>

        {/* Debounced Filename Search */}
        <div className="relative w-52 shrink-0">
          <div className="flex items-center bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#444] rounded px-2 py-1 text-xs">
            <Search size={13} className="text-gray-400 mr-1.5 shrink-0" />
            <input 
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search filename..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 min-w-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded text-gray-400">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Hidden Files Toggle */}
        <button 
          onClick={() => setShowHidden(prev => !prev)}
          className={`p-1.5 rounded border transition-colors ${showHidden ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-500' : 'bg-white dark:bg-[#1a1a1a] border-gray-300 dark:border-[#444] text-gray-500'}`}
          title={showHidden ? 'Hidden files visible (Click to hide)' : 'Hidden files hidden (Click to show)'}
        >
          {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {/* 3. Table Column Header */}
      <div className="h-7 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-[#333] px-3 flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
        <div 
          onClick={() => handleSortToggle('name')}
          className="flex-1 flex items-center space-x-1 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100"
        >
          <span>Name</span>
          {sortField === 'name' && (
            sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          )}
        </div>
        <div 
          onClick={() => handleSortToggle('size')}
          className="w-24 text-right flex items-center justify-end space-x-1 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100"
        >
          <span>Size</span>
          {sortField === 'size' && (
            sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          )}
        </div>
        <div 
          onClick={() => handleSortToggle('type')}
          className="w-28 text-right flex items-center justify-end space-x-1 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100 pr-2"
        >
          <span>Kind</span>
          {sortField === 'type' && (
            sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          )}
        </div>
      </div>

      {/* 4. Scrollable Item List */}
      <div ref={listRef} className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
        {error && (
          <div className="p-3 m-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded border border-red-200 dark:border-red-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => loadDirectory(currentPath)} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 rounded hover:bg-red-200 font-medium">Retry</button>
          </div>
        )}

        {(loading || searching) && !error ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-xs">
            <RotateCw size={20} className="animate-spin mb-2" />
            <span>{searching ? 'Searching workspace...' : 'Loading files...'}</span>
          </div>
        ) : displayedItems.length === 0 && !error ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-xs">
            <Folder size={28} className="mb-2 opacity-50" />
            <span>{isSearchActive ? `No files matching "${searchQuery}"` : 'This folder is empty'}</span>
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {renderedItems.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const fileInfo = !item.isDir ? getFileInfo(item.name) : null;
              const IconComp = item.isDir ? Folder : (fileInfo?.icon || File);
              const iconColor = item.isDir ? 'text-blue-500' : (fileInfo?.color || 'text-gray-400');
              const kindLabel = item.isDir ? 'Folder' : (fileInfo?.label || 'File');

              return (
                <div 
                  key={item.name + idx}
                  data-row-index={idx}
                  onClick={() => handleItemClick(idx, item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className={`flex items-center px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                    isSelected 
                      ? 'bg-blue-500 text-white font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-[#2a2d2e] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {/* Name & Icon */}
                  <div className="flex-1 flex items-center min-w-0 pr-2">
                    <IconComp size={15} className={`mr-2 shrink-0 ${isSelected ? 'text-white' : iconColor}`} />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {/* Size */}
                  <div className={`w-24 text-right font-mono truncate ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {item.isDir ? '--' : formatSize(item.size)}
                  </div>

                  {/* Kind */}
                  <div className={`w-28 text-right truncate pr-2 ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {kindLabel}
                  </div>
                </div>
              );
            })}

            {remainingCount > 0 && (
              <div className="p-2 text-center text-xs text-gray-400 dark:text-gray-500 italic">
                Showing first {maxRenderCount} of {displayedItems.length} items. Use search to narrow down.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Footer Action Bar */}
      <div className="h-12 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#252526] px-3 flex items-center justify-between shrink-0">
        {/* Selection Info */}
        <div className="flex-1 min-w-0 pr-3 text-xs text-gray-500 dark:text-gray-400 truncate">
          {isSearchActive ? (
            <span>Search: {displayedItems.length} results</span>
          ) : selectedItem ? (
            <span>Selected: <span className="font-medium text-gray-800 dark:text-gray-200">{selectedItem.name}</span></span>
          ) : (
            <span>Folder: <span className="font-mono text-gray-700 dark:text-gray-300">{currentPath}</span> ({displayedItems.length} items)</span>
          )}
        </div>

        {/* Filter Dropdown (in file mode) */}
        {mode === 'file' && !isSearchActive && (
          <div className="mr-3">
            <select 
              value={fileFilter}
              onChange={e => setFileFilter(e.target.value as FileFilter)}
              className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#444] rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-300 outline-none"
            >
              <option value="all">All Files (*.*)</option>
              <option value="code">Code Files</option>
              <option value="docs">Documents</option>
              <option value="media">Images & Media</option>
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-[#333] border border-gray-300 dark:border-[#555] hover:bg-gray-100 dark:hover:bg-[#3e3e3e] text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={mode === 'file' && (!selectedItem || selectedItem.isDir)}
            className="px-4 py-1.5 rounded text-xs font-medium bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-500 text-white flex items-center transition-colors shadow-sm"
          >
            <Check size={14} className="mr-1" />
            {mode === 'folder' ? 'Open Folder' : 'Open File'}
          </button>
        </div>
      </div>
    </div>
  );
}
