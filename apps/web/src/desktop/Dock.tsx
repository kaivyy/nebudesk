import { useWindowStore } from '../stores/windowStore';

export default function Dock() {
  const openWindow = useWindowStore(s => s.openWindow);
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-900/60 backdrop-blur rounded-2xl p-2 flex space-x-2">
      <button 
        onClick={() => openWindow({
          appId: 'files', title: 'Files', x: 100, y: 100, width: 600, height: 400, minWidth: 300, minHeight: 200, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        📁
      </button>
      <button 
        onClick={() => openWindow({
          appId: 'terminal', title: 'Terminal', x: 150, y: 150, width: 600, height: 400, minWidth: 400, minHeight: 300, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        💻
      </button>
    </div>
  );
}
