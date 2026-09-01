import { useState, useEffect, useMemo } from 'react';
import { 
  Folder, File, Search, Trash2, 
  FolderPlus, FilePlus, Home, HardDrive, Settings,
  AlignJustify, Grid, LayoutGrid, ChevronLeft, ChevronRight, Filter, Share
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';

interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
}

export default function FilesApp() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const loadFiles = async (dir: string) => {
    try {
      const backendUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${backendUrl}/api/files?p=${encodeURIComponent(dir)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFiles(data);
      setCurrentPath(dir);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const handleCreateFolder = async () => {
    const name = window.prompt('Folder name:');
    if (!name) return;
    try {
      await fetch(`http://${window.location.hostname}:3001/api/files/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ p: currentPath, name })
      });
      loadFiles(currentPath);
    } catch (e) {}
  };

  const handleCreateFile = async () => {
    const name = window.prompt('File name:');
    if (!name) return;
    try {
      await fetch(`http://${window.location.hostname}:3001/api/files/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ p: currentPath, name })
      });
      loadFiles(currentPath);
    } catch (e) {}
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      const target = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      await fetch(`http://${window.location.hostname}:3001/api/files?p=${encodeURIComponent(target)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      loadFiles(currentPath);
    } catch (e) {}
  };

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parent);
  };

  const filteredFiles = useMemo(() => {
    return files
      .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
  }, [files, searchQuery]);

  const sidebarItems = [
    { name: 'Root', path: '/', icon: <HardDrive size={16} /> },
    { name: 'Apps', path: '/apps', icon: <LayoutGrid size={16} /> },
    { name: 'Server', path: '/apps/server', icon: <Settings size={16} /> },
    { name: 'Web', path: '/apps/web', icon: <Home size={16} /> },
  ];

  return (
    <div className="h-full flex bg-white text-gray-800 font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 bg-[#f5f5f7] border-r border-gray-200 flex flex-col pt-10">
        <div className="px-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Favorites
        </div>
        <div className="flex flex-col px-2 space-y-0.5">
          {sidebarItems.map((item) => (
            <button
              key={item.path}
              onClick={() => setCurrentPath(item.path)}
              className={`flex items-center px-2 py-1.5 rounded-md text-sm transition-colors ${
                currentPath === item.path || currentPath.startsWith(item.path + '/') && item.path !== '/'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'hover:bg-gray-200/50 text-gray-700'
              }`}
            >
              <span className={`mr-2 ${currentPath === item.path ? 'text-white' : 'text-blue-500'}`}>
                {item.icon}
              </span>
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified macOS Toolbar */}
        <div className="h-14 bg-gradient-to-b from-gray-50 to-gray-100/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center px-4 shrink-0 nebudesk-drag-region">
          
          {/* Left spacer for absolute traffic lights in Window.tsx */}
          <div className="w-[60px] shrink-0"></div>

          {/* Navigation Controls (Back/Forward) */}
          <div className="flex items-center space-x-1 mr-4 shrink-0 nebudesk-no-drag">
            <button onClick={navigateUp} className="p-1 rounded-md hover:bg-gray-200/80 transition-colors text-gray-600 disabled:opacity-30" disabled={currentPath === '/'} title="Back">
              <ChevronLeft size={18} />
            </button>
            <button disabled className="p-1 rounded-md hover:bg-gray-200/80 transition-colors text-gray-600 opacity-30" title="Forward">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Title / Location (flex-1 to push right tools) */}
          <div className="flex-1 font-semibold text-gray-700 text-[13px] truncate mr-4 text-center">
            {currentPath.split('/').pop() || 'ROOT'}
          </div>

          {/* Right: Actions & Search */}
          <div className="flex items-center space-x-3 shrink-0 nebudesk-no-drag">
            {/* View Mode Segmented Control */}
            <div className="flex items-center bg-gray-200/50 rounded p-0.5 border border-gray-200/50 text-gray-600 shadow-sm">
              <button onClick={() => setViewMode('grid')} className={`p-1 rounded-sm ${viewMode === 'grid' ? 'bg-white shadow-sm text-black' : 'hover:bg-gray-200/50'}`} title="Grid View">
                <Grid size={15} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1 rounded-sm ${viewMode === 'list' ? 'bg-white shadow-sm text-black' : 'hover:bg-gray-200/50'}`} title="List View">
                <AlignJustify size={15} />
              </button>
            </div>

            {/* Sort / Share / Actions */}
            <div className="flex items-center space-x-1">
              <button className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-600 transition-colors" title="Sort">
                <Filter size={16} />
              </button>
              <button className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-600 transition-colors" title="Share">
                <Share size={16} />
              </button>
              <button onClick={handleCreateFolder} className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-600 transition-colors" title="New Folder">
                <FolderPlus size={16} />
              </button>
              <button onClick={handleCreateFile} className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-600 transition-colors" title="New File">
                <FilePlus size={16} />
              </button>
            </div>

            {/* Search Box */}
            <div className="flex items-center bg-white/70 rounded-md p-1 border border-gray-200 focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm w-48">
              <Search size={14} className="text-gray-400 ml-1 shrink-0" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-[13px] px-2 text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Path Bar (Optional sub-header) */}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-4 py-2 border-b border-red-100 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Files View */}
        <div className="flex-1 overflow-y-auto bg-white p-4">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <Folder size={64} className="text-gray-200" strokeWidth={1} />
              <p>No items found.</p>
            </div>
          ) : viewMode === 'list' ? (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium w-32">Kind</th>
                  <th className="pb-2 font-medium w-32 text-right">Size</th>
                  <th className="pb-2 font-medium w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map(file => (
                  <tr 
                    key={file.name} 
                    onClick={() => {
                      if (file.isDir) {
                        setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`);
                      } else {
                        const path = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                        useWindowStore.getState().openWindow({
                          appId: 'code', title: `Code - ${file.name}`, x: 150, y: 150, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path
                        } as any, true);
                      }
                    }}
                    className="border-b border-gray-50 hover:bg-blue-50/50 group cursor-pointer transition-colors"
                  >
                    <td className="py-2 flex items-center space-x-3">
                      {file.isDir ? (
                        <Folder className="text-blue-400 fill-blue-400/20" size={20} />
                      ) : (
                        <File className="text-gray-400" size={20} />
                      )}
                      <span className="truncate">{file.name}</span>
                    </td>
                    <td className="py-2 text-gray-500">{file.isDir ? 'Folder' : 'File'}</td>
                    <td className="py-2 text-gray-500 text-right">
                      {!file.isDir ? (file.size / 1024).toFixed(1) + ' KB' : '--'}
                    </td>
                    <td className="py-2 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(file.name); }}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filteredFiles.map(file => (
                <div 
                  key={file.name}
                  onClick={() => {
                    if (file.isDir) {
                      setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`);
                    } else {
                      const path = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
                      const appId = isImage ? 'image' : 'code';
                      const title = isImage ? `Image Viewer - ${file.name}` : `Code - ${file.name}`;
                      useWindowStore.getState().openWindow({
                        appId, title, x: 150, y: 150, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path
                      } as any, true);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-blue-50 group cursor-pointer text-center transition-colors relative"
                >
                  {file.isDir ? (
                    <Folder className="text-blue-400 fill-blue-400/20 mb-2" size={48} strokeWidth={1.5} />
                  ) : (
                    <File className="text-gray-400 mb-2" size={48} strokeWidth={1.5} />
                  )}
                  <span className="text-xs text-gray-700 truncate w-full px-1">{file.name}</span>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.name); }}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
