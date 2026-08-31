import MenuBar from './MenuBar';
import Dock from './Dock';
import { useWindowStore } from '../stores/windowStore';

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
            <div className="flex-1 p-4 text-black">
              Window Content
            </div>
          </div>
        ))}
      </div>
      
      <Dock />
    </div>
  );
}
