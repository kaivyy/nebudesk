import { useState, useEffect } from 'react';
import MenuBar from './MenuBar';
import Dock from './Dock';
import { useWindowStore } from '../stores/windowStore';
import FilesApp from '../apps/files/FilesApp';
import TerminalApp from '../apps/terminal/TerminalApp';
import DockerApp from '../apps/docker/DockerApp';
import ServicesApp from '../apps/services/ServicesApp';
import CodeApp from '../apps/code/CodeApp';
import SettingsApp from '../apps/settings/SettingsApp';
import TasksApp from '../apps/tasks/TasksApp';
import AppsApp from '../apps/applications/AppsApp';
import ImageApp from '../apps/image/ImageApp';
import DocsApp from '../apps/docs/DocsApp';
import SheetApp from '../apps/sheet/SheetApp';
import SlidesApp from '../apps/slides/SlidesApp';
import FilePicker from './FilePicker';
import Window from './Window';
import { useThemeStore } from '../stores/themeStore';

export default function Desktop() {
  const { wallpaper, theme, fetchTheme } = useThemeStore();
  useEffect(() => { fetchTheme(); }, []);
  const windows = useWindowStore(state => state.windows);
  
  // Picker State
  const [pickerProps, setPickerProps] = useState<{ onSelect: (p: string) => void, onCancel: () => void, initialPath: string, mode: 'file' | 'folder' } | null>(null);

  useEffect(() => {
    const handlePickFolder = (e: any) => {
      setPickerProps({
        mode: 'folder',
        initialPath: e.detail.initialPath || '/root',
        onSelect: (path: string) => {
          if (e.detail.onSelect) e.detail.onSelect(path);
          setPickerProps(null);
        },
        onCancel: () => setPickerProps(null)
      });
    };
    const handlePickFile = (e: any) => {
      setPickerProps({
        mode: 'file',
        initialPath: e.detail.initialPath || '/root',
        onSelect: (path: string) => {
          if (e.detail.onSelect) e.detail.onSelect(path);
          setPickerProps(null);
        },
        onCancel: () => setPickerProps(null)
      });
    };
    document.addEventListener('desktop:pick-folder', handlePickFolder);
    document.addEventListener('desktop:pick-file', handlePickFile);
    return () => {
      document.removeEventListener('desktop:pick-folder', handlePickFolder);
      document.removeEventListener('desktop:pick-file', handlePickFile);
    };
  }, []);
  
  return (
    <div 
      className={`w-full h-full flex flex-col relative overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{ 
        backgroundColor: wallpaper === 'solid-black' ? '#000000' : wallpaper === 'solid-gray' ? '#1f2937' : '#0f172a',
        backgroundImage: (wallpaper === 'nebu' || wallpaper === 'default') ? 'url(/wallpaper.jpg)' : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {pickerProps && <FilePicker {...pickerProps} />}
      <MenuBar />
      <div className="flex-1 relative">
        {windows.map(win => (
          <Window key={win.id} win={win}>
            {win.appId === 'files' && <FilesApp initialPath={(win as any).path} />}
            {win.appId === 'terminal' && <TerminalApp winId={win.id} />}
            {win.appId === 'code' && <CodeApp initialPath={(win as any).path} winId={win.id} />}
                        {win.appId === 'docker' && <DockerApp />}
            {win.appId === 'services' && <ServicesApp />}
            {win.appId === 'settings' && <SettingsApp />}
            {win.appId === 'tasks' && <TasksApp />}
            {win.appId === 'manager' && <AppsApp />}
            {win.appId === 'image' && <ImageApp initialPath={(win as any).path} />}
            {win.appId === 'docs' && <DocsApp initialPath={(win as any).path} />}
            {win.appId === 'sheet' && <SheetApp />}
            {win.appId === 'slides' && <SlidesApp />}
          </Window>
        ))}
      </div>
      <Dock />
    </div>
  );
}
