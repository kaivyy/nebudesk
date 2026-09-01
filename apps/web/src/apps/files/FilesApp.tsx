import { useState, useEffect } from 'react';

interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
}

export default function FilesApp() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState('');

  const loadFiles = async (dir: string) => {
    try {
      const backendUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${backendUrl}/api/files?p=${encodeURIComponent(dir)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFiles(data); // In index.ts it returns just the array `items`
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

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-12 border-b flex items-center px-2 space-x-2 bg-gray-50 text-sm">
        <button 
          onClick={() => {
            const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
            setCurrentPath(parent);
          }}
          className="px-2 py-1 bg-white border rounded shadow-sm hover:bg-gray-100">
          ↑
        </button>
        <button onClick={handleCreateFolder} className="px-2 py-1 bg-white border rounded shadow-sm hover:bg-gray-100">
          + Folder
        </button>
        <button onClick={handleCreateFile} className="px-2 py-1 bg-white border rounded shadow-sm hover:bg-gray-100">
          + File
        </button>
        <span className="px-2 flex-1 truncate text-gray-600 font-mono text-xs">{currentPath}</span>
      </div>
      
      {error && <div className="p-2 text-red-500 text-xs bg-red-50">{error}</div>}
      
      <div className="flex-1 overflow-auto p-2 flex flex-col gap-1">
        {files.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name)).map(file => (
          <div 
            key={file.name} 
            className="flex items-center px-2 py-1.5 hover:bg-blue-50 rounded group select-none">
            <div 
              className="flex-1 flex items-center cursor-pointer"
              onDoubleClick={() => file.isDir && setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`)}
            >
              <span className="w-6">{file.isDir ? '📁' : '📄'}</span>
              <span className="flex-1 truncate text-sm">{file.name}</span>
            </div>
            <span className="text-xs text-gray-400 w-16 text-right mr-4">
              {!file.isDir && (file.size / 1024).toFixed(1) + ' KB'}
            </span>
            <button 
              onClick={() => handleDelete(file.name)}
              className="text-red-500 opacity-0 group-hover:opacity-100 text-xs px-2 hover:underline">
              Delete
            </button>
          </div>
        ))}
        {files.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">Empty folder</div>}
      </div>
    </div>
  );
}
