import { useState, useEffect, useMemo } from 'react';
import { 
  Folder, File, ChevronUp, Search, Trash2, 
  FolderPlus, FilePlus, Home, HardDrive, Settings,
  AlignJustify, Grid, LayoutGrid
} from 'lucide-react';

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
        {/* Toolbar */}
        <div className="h-14 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
          
          {/* Left: Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-gray-500">
              <button onClick={navigateUp} className="p-1 rounded-md hover:bg-gray-100 transition-colors" title="Up">
                <ChevronUp size={20} />
              </button>
            </div>
            <div className="font-semibold text-gray-700 truncate max-w-xs">
              {currentPath}
            </div>
          </div>

          {/* Right: Actions & Search */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-md p-1 border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-all shadow-sm">
              <Search size={16} className="text-gray-400 ml-1" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-40 text-sm px-2 text-gray-700 placeholder-gray-400"
              />
            </div>

            <div className="flex items-center space-x-1 border-l pl-3 border-gray-200 text-gray-600">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="List View">
                <AlignJustify size={16} />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Grid View">
                <Grid size={16} />
              </button>
            </div>

            <div className="flex items-center space-x-1 border-l pl-3 border-gray-200 text-gray-600">
              <button onClick={handleCreateFolder} className="p-1.5 rounded-md hover:bg-gray-100" title="New Folder">
                <FolderPlus size={16} />
              </button>
              <button onClick={handleCreateFile} className="p-1.5 rounded-md hover:bg-gray-100" title="New File">
                <FilePlus size={16} />
              </button>
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
                    onClick={() => file.isDir && setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`)}
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
                        onClick={() => handleDelete(file.name)}
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
                  onClick={() => file.isDir && setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-blue-50 group cursor-pointer text-center transition-colors relative"
                >
                  {file.isDir ? (
                    <Folder className="text-blue-400 fill-blue-400/20 mb-2" size={48} strokeWidth={1.5} />
                  ) : (
                    <File className="text-gray-400 mb-2" size={48} strokeWidth={1.5} />
                  )}
                  <span className="text-xs text-gray-700 truncate w-full px-1">{file.name}</span>
                  
                  <button 
                    onClick={() => handleDelete(file.name)}
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
