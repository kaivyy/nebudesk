import MenuBar from './MenuBar';
import Dock from './Dock';
import { useWindowStore } from '../stores/windowStore';
import FilesApp from '../apps/files/FilesApp';
import TerminalApp from '../apps/terminal/TerminalApp';
import SystemApp from '../apps/system/SystemApp';
import DockerApp from '../apps/docker/DockerApp';
import ServicesApp from '../apps/services/ServicesApp';

export default function Desktop() {
  const windows = useWindowStore(state => state.windows);
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black flex flex-col relative overflow-hidden">
      <MenuBar />
      
      <div className="flex-1 relative">
        {/* Render windows here later */}
        {windows.map(win => (
          <div key={win.id} 
               className="absolute bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
               style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex }}>
            <div className="h-8 bg-gray-100 border-b flex items-center px-2 cursor-pointer font-medium text-sm">
              {win.title}
            </div>
            <div className="flex-1 overflow-hidden relative text-black">
              {win.appId === 'files' && <FilesApp />}
              {win.appId === 'terminal' && <TerminalApp />}
              {win.appId === 'system' && <SystemApp />}
              {win.appId === 'docker' && <DockerApp />}
              {win.appId === 'services' && <ServicesApp />}
            </div>
          </div>
        ))}
      </div>
      
      <Dock />
    </div>
  );
}
