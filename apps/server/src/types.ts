export interface AuthUser {
  id: string;
  username: string;
}

export interface UserRow {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface DesktopStateRow {
  id: string;
  userId: string;
  wallpaper: string;
  theme: string;
  windowsJson: string;
}

export interface ApplicationRow {
  id: string;
  name: string;
  runtime: 'docker' | 'pm2' | 'systemd';
  identifier: string;
  internalHost: string;
  internalPort?: number;
  publicDomain?: string;
  proxyEnabled: number;
  cfEnabled: number;
  createdAt: string;
  updatedAt: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

export interface DocumentRow {
  id: string;
  userId: string;
  name: string;
  type: string;
  content: string;
  updatedAt: string;
}

export interface DevServerInfo {
  port: string;
  pid: number;
  cwd: string;
  process: string;
  localAddress?: string;
}

export interface SystemServiceInfo {
  name: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export interface ProjectInfo {
  root: string;
  name: string;
  isProject: boolean;
  ecosystems: string[];
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'composer' | 'cargo' | 'pip' | 'poetry' | 'go' | null;
  framework: string | null;
  scripts: Record<string, string>;
  devCommand: string | null;
  buildCommand: string | null;
  testCommand: string | null;
  configFiles: string[];
  isMonorepo?: boolean | undefined;
  workspaces?: string[] | undefined;
}
