import { useState, useEffect } from 'react';
import { Folder, File, ChevronUp, X, Check } from 'lucide-react';

export default function FilePicker({ 
  onSelect, 
  onCancel, 
  initialPath = '/root',
  mode = 'folder'
}: { 
  onSelect: (path: string) => void;
  onCancel: () => void;
  initialPath?: string;
  mode?: 'file' | 'folder';
}) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState<{name: string, isDir: boolean}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelectedFile(null); // reset selection on dir change
    const baseUrl = `http://${window.location.hostname}:3001`;
    fetch(`${baseUrl}/api/files?p=${encodeURIComponent(currentPath)}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          let filtered = data;
          if (mode === 'folder') filtered = data.filter(d => d.isDir);
          setItems(filtered.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          }));
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentPath, mode]);

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath('/' + parts.join('/'));
  };

  const handleConfirm = () => {
    if (mode === 'folder') {
      onSelect(currentPath);
    } else if (mode === 'file' && selectedFile) {
      onSelect(currentPath === '/' ? `/${selectedFile}` : `${currentPath}/${selectedFile}`);
    }
  };

  const handleItemClick = (f: {name: string, isDir: boolean}) => {
    if (f.isDir) {
      setCurrentPath(currentPath === '/' ? `/${f.name}` : `${currentPath}/${f.name}`);
    } else if (mode === 'file') {
      setSelectedFile(f.name);
    }
  };
  
  const handleItemDoubleClick = (f: {name: string, isDir: boolean}) => {
    if (f.isDir) {
      setCurrentPath(currentPath === '/' ? `/${f.name}` : `${currentPath}/${f.name}`);
    } else if (mode === 'file') {
      onSelect(currentPath === '/' ? `/${f.name}` : `${currentPath}/${f.name}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-gray-800 w-[450px] rounded-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="h-10 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
          <span className="font-semibold text-sm">{mode === 'folder' ? 'Select Folder' : 'Select File'}</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-800 rounded-md p-1 transition-colors"><X size={16} /></button>
        </div>
        
        {/* Toolbar */}
        <div className="p-2 border-b border-gray-200 flex items-center space-x-2 bg-gray-50">
          <button onClick={navigateUp} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"><ChevronUp size={16} /></button>
          <input 
            type="text" 
            value={currentPath} 
            onChange={e => setCurrentPath(e.target.value)}
            className="flex-1 bg-white border border-gray-300 focus:border-blue-500 rounded px-2 py-1 text-sm outline-none"
          />
        </div>

        {/* List */}
        <div className="h-64 overflow-y-auto p-2 bg-white">
          {error && <div className="text-red-500 text-sm p-2 bg-red-50 rounded border border-red-100">{error}</div>}
          {loading && !error ? (
            <div className="text-gray-400 text-sm p-2 text-center mt-8">Loading...</div>
          ) : items.length === 0 && !error ? (
            <div className="text-gray-400 text-sm p-2 text-center mt-8">Empty directory</div>
          ) : (
            <div className="space-y-0.5">
              {items.map(f => {
                const isSelected = selectedFile === f.name;
                return (
                  <div 
                    key={f.name}
                    onClick={() => handleItemClick(f)}
                    onDoubleClick={() => handleItemDoubleClick(f)}
                    className={`flex items-center px-2 py-1.5 cursor-pointer rounded select-none ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-blue-50 text-gray-700'}`}
                  >
                    {f.isDir ? (
                      <Folder size={16} className={`mr-2 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                    ) : (
                      <File size={16} className={`mr-2 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                    )}
                    <span className="text-sm truncate">{f.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-gray-200 flex items-center justify-end px-4 space-x-2 bg-gray-50">
          <button onClick={onCancel} className="px-4 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm transition-colors shadow-sm">Cancel</button>
          <button 
            onClick={handleConfirm} 
            disabled={mode === 'file' && !selectedFile}
            className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white text-sm flex items-center transition-colors shadow-sm"
          >
            <Check size={14} className="mr-1" /> Open
          </button>
        </div>
      </div>
    </div>
  );
}
