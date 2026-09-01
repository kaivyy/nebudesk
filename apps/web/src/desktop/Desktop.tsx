import MenuBar from './MenuBar';
import Dock from './Dock';
import { useWindowStore } from '../stores/windowStore';
import FilesApp from '../apps/files/FilesApp';
import TerminalApp from '../apps/terminal/TerminalApp';
import SystemApp from '../apps/system/SystemApp';
import DockerApp from '../apps/docker/DockerApp';
import ServicesApp from '../apps/services/ServicesApp';
import Window from './Window';

export default function Desktop() {
  const windows = useWindowStore(state => state.windows);
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black flex flex-col relative overflow-hidden">
      <MenuBar />
      <div className="flex-1 relative">
        {windows.map(win => (
          <Window key={win.id} win={win}>
            {win.appId === 'files' && <FilesApp />}
            {win.appId === 'terminal' && <TerminalApp />}
            {win.appId === 'system' && <SystemApp />}
            {win.appId === 'docker' && <DockerApp />}
            {win.appId === 'services' && <ServicesApp />}
          </Window>
        ))}
      </div>
      <Dock />
    </div>
  );
}
