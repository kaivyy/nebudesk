export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  dock: boolean;
}

export const APP_REGISTRY: Record<string, AppDefinition> = {
  files: { id: 'files', title: 'Finder', icon: '/icons/finder.png', defaultWidth: 700, defaultHeight: 450, minWidth: 550, minHeight: 300, dock: true },
  code: { id: 'code', title: 'NebuCode', icon: '/icons/vscode.png', defaultWidth: 1000, defaultHeight: 650, minWidth: 600, minHeight: 400, dock: true },
  terminal: { id: 'terminal', title: 'Terminal', icon: '/icons/terminal.png', defaultWidth: 700, defaultHeight: 450, minWidth: 500, minHeight: 300, dock: true },
  tasks: { id: 'tasks', title: 'Task Manager', icon: '/icons/automator.png', defaultWidth: 700, defaultHeight: 450, minWidth: 550, minHeight: 300, dock: true },
  docker: { id: 'docker', title: 'Docker', icon: '/icons/docker.png', defaultWidth: 700, defaultHeight: 450, minWidth: 550, minHeight: 300, dock: true },
  services: { id: 'services', title: 'Services', icon: '/icons/services.svg', defaultWidth: 700, defaultHeight: 450, minWidth: 550, minHeight: 300, dock: true },
  docs: { id: 'docs', title: 'NebuDocs', icon: '/icons/pages.svg', defaultWidth: 800, defaultHeight: 600, minWidth: 550, minHeight: 350, dock: true },
  sheet: { id: 'sheet', title: 'NebuSheet', icon: '/icons/numbers.svg', defaultWidth: 800, defaultHeight: 600, minWidth: 550, minHeight: 350, dock: true },
  slides: { id: 'slides', title: 'NebuSlides', icon: '/icons/keynote.svg', defaultWidth: 850, defaultHeight: 600, minWidth: 600, minHeight: 400, dock: true },
  manager: { id: 'manager', title: 'App Manager', icon: '/icons/manager.svg', defaultWidth: 700, defaultHeight: 450, minWidth: 550, minHeight: 300, dock: true },
  image: { id: 'image', title: 'Media Viewer', icon: '/icons/photos.svg', defaultWidth: 800, defaultHeight: 520, minWidth: 450, minHeight: 320, dock: true },
  settings: { id: 'settings', title: 'System Settings', icon: '/icons/settings.png', defaultWidth: 700, defaultHeight: 450, minWidth: 550, minHeight: 300, dock: true }
};

export const DOCK_APPS = Object.values(APP_REGISTRY).filter(a => a.dock);
