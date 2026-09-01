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
      <button 
        onClick={() => openWindow({
          appId: 'system', title: 'System Monitor', x: 200, y: 100, width: 700, height: 500, minWidth: 500, minHeight: 400, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        📊
      </button>
      <button 
        onClick={() => openWindow({
          appId: 'docker', title: 'Docker Manager', x: 250, y: 150, width: 700, height: 400, minWidth: 500, minHeight: 300, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        🐳
      </button>
      <button 
        onClick={() => openWindow({
          appId: 'services', title: 'Services & Logs', x: 300, y: 150, width: 800, height: 500, minWidth: 600, minHeight: 400, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        ⚙️
      </button>
    </div>
  );
}
