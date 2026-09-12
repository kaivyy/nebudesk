import { useEffect, useRef } from 'react';
import MenuBar from './MenuBar';
import CommandPalette from './CommandPalette';
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
  
  // Stored callbacks for active pickers indexed by pickerId
  const pickerCallbacksRef = useRef<Record<string, { onSelect?: (p: string) => void, onCancel?: () => void }>>({});

  useEffect(() => {
    // Purge any stale picker windows from prior sessions on mount
    const state = useWindowStore.getState();
    const stalePickers = state.windows.filter(w => w.appId === 'picker');
    stalePickers.forEach(w => state.closeWindow(w.id));
  }, []);

  useEffect(() => {
    interface PickEventDetail {
      initialPath?: string;
      onSelect?: (p: string) => void;
      onCancel?: () => void;
    }
    const handlePickFolder = (e: Event) => {
      const detail = (e as CustomEvent<PickEventDetail>).detail || {};
      const pickerId = 'picker_' + Date.now();
      pickerCallbacksRef.current[pickerId] = {
        onSelect: detail.onSelect,
        onCancel: detail.onCancel
      };
      const w = Math.min(window.innerWidth - 60, 760);
      const h = Math.min(window.innerHeight - 100, 520);
      const x = Math.max(30, Math.round((window.innerWidth - w) / 2));
      const y = Math.max(40, Math.round((window.innerHeight - h) / 2) - 20);
      useWindowStore.getState().openWindow({
        appId: 'picker',
        title: 'Open Folder',
        x, y,
        width: w,
        height: h,
        minWidth: 540,
        minHeight: 360,
        minimized: false,
        maximized: false,
        path: detail.initialPath || '/root',
        payload: { mode: 'folder', pickerId }
      }, true);
    };

    const handlePickFile = (e: Event) => {
      const detail = (e as CustomEvent<PickEventDetail>).detail || {};
      const pickerId = 'picker_' + Date.now();
      pickerCallbacksRef.current[pickerId] = {
        onSelect: detail.onSelect,
        onCancel: detail.onCancel
      };
      const w = Math.min(window.innerWidth - 60, 760);
      const h = Math.min(window.innerHeight - 100, 520);
      const x = Math.max(30, Math.round((window.innerWidth - w) / 2));
      const y = Math.max(40, Math.round((window.innerHeight - h) / 2) - 20);
      useWindowStore.getState().openWindow({
        appId: 'picker',
        title: 'Open File',
        x, y,
        width: w,
        height: h,
        minWidth: 540,
        minHeight: 360,
        minimized: false,
        maximized: false,
        path: detail.initialPath || '/root',
        payload: { mode: 'file', pickerId }
      }, true);
    };
    document.addEventListener('desktop:pick-folder', handlePickFolder);
    document.addEventListener('desktop:pick-file', handlePickFile);
    return () => {
      document.removeEventListener('desktop:pick-folder', handlePickFolder);
      document.removeEventListener('desktop:pick-file', handlePickFile);
    };
  }, []);
  
  return (
    <div className={`w-full h-full flex flex-col relative overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Static Wallpaper Background - fixed to prevent mobile keyboard resize glitches */}
      <div 
        className="fixed inset-0 w-full h-[100vh] -z-10"
        style={{ 
          backgroundColor: wallpaper === 'solid-black' ? '#000000' : wallpaper === 'solid-gray' ? '#1f2937' : (wallpaper === 'solid-white' || wallpaper === 'white') ? '#f8fafc' : '#0f172a',
          backgroundImage: (wallpaper === 'nebu' || wallpaper === 'default') ? 'url(/wallpaper.jpg)' : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <CommandPalette />
      <MenuBar />
      <div className="flex-1 relative z-0">
        {windows.map(win => (
          <Window key={win.id} win={win}>
            {win.appId === 'files' && <FilesApp initialPath={win.path} />}
            {win.appId === 'terminal' && <TerminalApp winId={win.id} />}
            {win.appId === 'code' && <CodeApp initialPath={win.path || (win.payload?.file as string | undefined)} winId={win.id} />}
            {win.appId === 'docker' && <DockerApp />}
            {win.appId === 'services' && <ServicesApp />}
            {win.appId === 'settings' && <SettingsApp />}
            {win.appId === 'tasks' && <TasksApp />}
            {win.appId === 'manager' && <AppsApp />}
            {win.appId === 'image' && <ImageApp initialPath={win.path} />}
            {win.appId === 'docs' && <DocsApp initialPath={win.path} />}
            {win.appId === 'sheet' && <SheetApp />}
            {win.appId === 'slides' && <SlidesApp />}
            {win.appId === 'picker' && (
              <FilePicker
                winId={win.id}
                mode={(win.payload?.mode as 'file' | 'folder') || 'folder'}
                initialPath={win.path || '/root'}
                onSelect={(chosenPath) => {
                  const pickerId = win.payload?.pickerId as string;
                  const cb = pickerId ? pickerCallbacksRef.current[pickerId] : null;
                  if (cb?.onSelect) cb.onSelect(chosenPath);
                  if (pickerId) delete pickerCallbacksRef.current[pickerId];
                  useWindowStore.getState().closeWindow(win.id);
                }}
                onCancel={() => {
                  const pickerId = win.payload?.pickerId as string;
                  const cb = pickerId ? pickerCallbacksRef.current[pickerId] : null;
                  if (cb?.onCancel) cb.onCancel();
                  if (pickerId) delete pickerCallbacksRef.current[pickerId];
                  useWindowStore.getState().closeWindow(win.id);
                }}
              />
            )}
          </Window>
        ))}
      </div>
      <Dock />
    </div>
  );
}
