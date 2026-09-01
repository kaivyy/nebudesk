import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function CodeApp({ initialPath = '' }: { initialPath?: string }) {
  const [filePath, setFilePath] = useState(initialPath);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadFile = async (p: string) => {
    if (!p) return;
    setLoading(true);
    setError('');
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/files/content?p=${encodeURIComponent(p)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load file');
      setContent(data.content);
      setOriginalContent(data.content);
      setFilePath(p);
      setStatus(`Loaded ${p}`);
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const saveFile = async () => {
    if (!filePath) return;
    setStatus('Saving...');
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/files/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ p: filePath, content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save file');
      setOriginalContent(content);
      setStatus('Saved successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Save failed: ${e.message}`);
    }
  };

  useEffect(() => {
    if (initialPath) {
      loadFile(initialPath);
    }
  }, [initialPath]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
  };

  const isDirty = content !== originalContent;
  
  // Simple heuristic for language
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'ts': 'typescript', 'tsx': 'typescript',
    'js': 'javascript', 'jsx': 'javascript',
    'json': 'json', 'html': 'html', 'css': 'css',
    'md': 'markdown', 'py': 'python', 'sh': 'shell',
    'yaml': 'yaml', 'yml': 'yaml', 'sql': 'sql', 'xml': 'xml'
  };
  const language = langMap[ext] || 'plaintext';

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300" onKeyDown={handleKeyDown}>
      <div className="flex items-center px-2 py-1.5 bg-[#2d2d2d] border-b border-[#1e1e1e] text-sm">
        <input 
          type="text" 
          value={filePath} 
          onChange={(e) => setFilePath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadFile(filePath)}
          placeholder="/path/to/file.ts"
          className="flex-1 bg-[#1e1e1e] text-white px-2 py-1 rounded border border-[#3e3e3e] focus:outline-none focus:border-blue-500"
        />
        <button 
          onClick={() => loadFile(filePath)}
          className="ml-2 px-3 py-1 bg-[#3e3e3e] hover:bg-[#4e4e4e] rounded"
        >
          Load
        </button>
        <button 
          onClick={saveFile}
          disabled={!filePath || !isDirty}
          className={`ml-2 px-3 py-1 rounded transition-colors ${!filePath || !isDirty ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          Save
        </button>
      </div>

      {(error || status) && (
        <div className={`px-4 py-1 text-xs ${error ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
          {error || status}
        </div>
      )}

      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] z-10">
            Loading...
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={content}
            onChange={(val) => setContent(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              formatOnPaste: true
            }}
          />
        )}
      </div>
      
      <div className="h-6 bg-[#007acc] text-white flex items-center px-3 text-xs justify-between">
        <div className="flex space-x-3">
          <span>{filePath ? (isDirty ? '● Unsaved' : 'Saved') : 'No file loaded'}</span>
          <span>{language}</span>
        </div>
        <div>
          NebuCode
        </div>
      </div>
    </div>
  );
}
