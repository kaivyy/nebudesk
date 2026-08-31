import { useState, useEffect } from 'react';

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export default function FilesApp() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState('');

  const loadFiles = async (dir: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/files?dir=${encodeURIComponent(dir)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFiles(data.files);
      setCurrentPath(data.path);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-12 border-b flex items-center px-4 space-x-2 bg-gray-50">
        <button 
          onClick={() => {
            const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
            setCurrentPath(parent);
          }}
          className="px-2 py-1 bg-white border rounded hover:bg-gray-100">
          ↑
        </button>
        <span className="text-sm px-2 flex-1 truncate">{currentPath}</span>
      </div>
      
      {error && <div className="p-4 text-red-500">{error}</div>}
      
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-1">
        {files.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name)).map(file => (
          <div 
            key={file.name} 
            onDoubleClick={() => file.isDirectory && setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`)}
            className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer select-none">
            <span className="w-6">{file.isDirectory ? '📁' : '📄'}</span>
            <span className="flex-1 truncate text-sm">{file.name}</span>
            <span className="text-xs text-gray-500 w-24 text-right">
              {!file.isDirectory && (file.size / 1024).toFixed(1) + ' KB'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
