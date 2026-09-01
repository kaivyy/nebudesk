import { useState, useEffect } from 'react';
import { Folder, ChevronUp, X, Check } from 'lucide-react';

export default function FolderPicker({ 
  onSelect, 
  onCancel, 
  initialPath = '/root' 
}: { 
  onSelect: (path: string) => void;
  onCancel: () => void;
  initialPath?: string;
}) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [folders, setFolders] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const baseUrl = `http://${window.location.hostname}:3001`;
    fetch(`${baseUrl}/api/files?p=${encodeURIComponent(currentPath)}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFolders(data.filter(d => d.isDir).sort((a, b) => a.name.localeCompare(b.name)));
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentPath]);

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath('/' + parts.join('/'));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#252526] text-gray-200 w-[450px] rounded-lg shadow-2xl flex flex-col border border-[#3e3e42] overflow-hidden">
        {/* Header */}
        <div className="h-10 border-b border-[#3e3e42] flex items-center justify-between px-4 bg-[#2d2d2d]">
          <span className="font-semibold text-sm">Select Folder</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-white rounded-md p-1"><X size={16} /></button>
        </div>
        
        {/* Toolbar */}
        <div className="p-2 border-b border-[#3e3e42] flex items-center space-x-2 bg-[#2d2d2d]">
          <button onClick={navigateUp} className="p-1.5 hover:bg-[#3e3e42] rounded text-gray-300"><ChevronUp size={16} /></button>
          <input 
            type="text" 
            value={currentPath} 
            onChange={e => setCurrentPath(e.target.value)}
            className="flex-1 bg-[#3c3c3c] border border-transparent focus:border-blue-500 rounded px-2 py-1 text-sm outline-none"
          />
        </div>

        {/* List */}
        <div className="h-64 overflow-y-auto p-2 bg-[#1e1e1e]">
          {error && <div className="text-red-400 text-sm p-2">{error}</div>}
          {loading && !error ? (
            <div className="text-gray-400 text-sm p-2 text-center">Loading...</div>
          ) : folders.length === 0 && !error ? (
            <div className="text-gray-500 text-sm p-2 text-center">Empty directory</div>
          ) : (
            <div className="space-y-0.5">
              {folders.map(f => (
                <div 
                  key={f.name}
                  onClick={() => setCurrentPath(currentPath === '/' ? `/${f.name}` : `${currentPath}/${f.name}`)}
                  className="flex items-center px-2 py-1.5 hover:bg-[#2a2d2e] cursor-pointer rounded group"
                >
                  <Folder size={16} className="text-blue-400 mr-2" />
                  <span className="text-sm truncate select-none">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#3e3e42] flex items-center justify-end px-4 space-x-2 bg-[#2d2d2d]">
          <button onClick={onCancel} className="px-4 py-1.5 rounded bg-[#3c3c3c] hover:bg-[#4a4a4a] text-sm transition-colors">Cancel</button>
          <button onClick={() => onSelect(currentPath)} className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center transition-colors">
            <Check size={14} className="mr-1" /> Open
          </button>
        </div>
      </div>
    </div>
  );
}
