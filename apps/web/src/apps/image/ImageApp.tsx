import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export default function ImageApp({ initialPath = '' }: { initialPath?: string }) {
  const [filePath] = useState(initialPath);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);

  const loadImage = async (p: string) => {
    if (!p) return;
    setError('');
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/files/download?p=${encodeURIComponent(p)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load image');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (initialPath) {
      loadImage(initialPath);
    }
  }, [initialPath]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white select-none">
      <div className="h-14 border-b border-gray-800 bg-gray-900 flex items-center shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[70px] shrink-0"></div>
        <div className="text-sm font-medium truncate max-w-sm text-gray-300">
          {filePath || 'No image selected'}
        </div>
        <div className="flex-1"></div><div className="flex space-x-2 mr-4">
          <button onClick={() => setZoom(z => Math.max(0.1, z - 0.25))} className="p-1.5 hover:bg-gray-800 rounded">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs flex items-center w-12 justify-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="p-1.5 hover:bg-gray-800 rounded">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(1)} className="p-1.5 hover:bg-gray-800 rounded ml-2">
            <Maximize size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={filePath} 
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
            className="max-w-none origin-center"
            draggable={false}
          />
        ) : (
          <div className="text-gray-600">No image loaded</div>
        )}
      </div>
    </div>
  );
}
