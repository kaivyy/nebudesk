import { useState, useEffect } from 'react';
import MenuBar from './MenuBar';
import Dock from './Dock';
import { useWindowStore } from '../stores/windowStore';
import FilesApp from '../apps/files/FilesApp';
import TerminalApp from '../apps/terminal/TerminalApp';
import SystemApp from '../apps/system/SystemApp';
import DockerApp from '../apps/docker/DockerApp';
import ServicesApp from '../apps/services/ServicesApp';
import CodeApp from '../apps/code/CodeApp';
import SettingsApp from '../apps/settings/SettingsApp';
import TasksApp from '../apps/tasks/TasksApp';
import ImageApp from '../apps/image/ImageApp';
import DocsApp from '../apps/docs/DocsApp';
import SheetApp from '../apps/sheet/SheetApp';
import SlidesApp from '../apps/slides/SlidesApp';
import FolderPicker from './FolderPicker';
import Window from './Window';
import { useThemeStore } from '../stores/themeStore';

export default function Desktop() {
  const { wallpaper, theme, fetchTheme } = useThemeStore();
  useEffect(() => { fetchTheme(); }, []);
  const windows = useWindowStore(state => state.windows);
  
  // Folder Picker State
  const [pickerProps, setPickerProps] = useState<{ onSelect: (p: string) => void, onCancel: () => void, initialPath: string } | null>(null);

  useEffect(() => {
    const handlePickFolder = (e: any) => {
      setPickerProps({
        initialPath: e.detail.initialPath || '/root',
        onSelect: (path: string) => {
          if (e.detail.onSelect) e.detail.onSelect(path);
          setPickerProps(null);
        },
        onCancel: () => {
          setPickerProps(null);
        }
      });
    };
    document.addEventListener('desktop:pick-folder', handlePickFolder);
    return () => document.removeEventListener('desktop:pick-folder', handlePickFolder);
  }, []);
  
  return (
    <div className={`w-full h-full flex flex-col relative overflow-hidden ${
      wallpaper === 'solid-black' ? 'bg-black' : 
      wallpaper === 'solid-gray' ? 'bg-gray-800' : 
      'bg-gradient-to-br from-blue-900 to-black'
    } ${theme === 'dark' ? 'dark' : ''}`}>
      {pickerProps && <FolderPicker {...pickerProps} />}
      <MenuBar />
      <div className="flex-1 relative">
        {windows.map(win => (
          <Window key={win.id} win={win}>
            {win.appId === 'files' && <FilesApp />}
            {win.appId === 'terminal' && <TerminalApp winId={win.id} />}
            {win.appId === 'code' && <CodeApp initialPath={(win as any).path} winId={win.id} />}
            {win.appId === 'system' && <SystemApp />}
            {win.appId === 'docker' && <DockerApp />}
            {win.appId === 'services' && <ServicesApp />}
            {win.appId === 'settings' && <SettingsApp />}
            {win.appId === 'tasks' && <TasksApp />}
            {win.appId === 'image' && <ImageApp initialPath={(win as any).path} />}
            {win.appId === 'docs' && <DocsApp />}
            {win.appId === 'sheet' && <SheetApp />}
            {win.appId === 'slides' && <SlidesApp />}
          </Window>
        ))}
      </div>
      <Dock />
    </div>
  );
}
