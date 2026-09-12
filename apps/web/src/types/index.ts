export type AppId = 
  | 'files'
  | 'code'
  | 'terminal'
  | 'tasks'
  | 'docker'
  | 'services'
  | 'docs'
  | 'sheet'
  | 'slides'
  | 'manager'
  | 'settings'
  | 'image';

export interface DesktopWindow {
  id: string;
  appId: AppId | string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  payload?: Record<string, unknown>;
  path?: string;
}

export interface DevServer {
  port: string;
  pid: number;
  cwd: string;
  process: string;
  localAddress?: string;
}

export interface FileItem {
  name: string;
  isDir: boolean;
  size: number;
}

export interface DocumentItem {
  id: string;
  userId?: string;
  name: string;
  type?: string;
  content?: string;
  updatedAt?: string;
}

export interface SystemStats {
  cpu: { currentLoad: number; cpus?: unknown[] };
  mem: { total: number; free: number; used: number; active?: number };
  fsSize: Array<{ fs: string; type: string; size: number; used: number; use: number; mount: string }>;
  osInfo: { platform: string; distro: string; release: string; hostname: string };
  storage?: Array<{ fs: string; size: number; used: number; use: number; mount: string }>;
  network?: Array<{ iface: string; ip4: string; operstate: string }>;
}

export interface ProcessItem {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  user?: string;
  command?: string;
}
