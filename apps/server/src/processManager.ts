import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import si from 'systeminformation';
import { safeResolve, ALLOWED_ROOT } from './pathUtils.js';

export type ProcessStatus = 'starting' | 'running' | 'stopped' | 'failed' | 'restarting' | 'unknown';

export interface ManagedProcess {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  status: ProcessStatus;
  pid: number | null;
  ports: number[];
  startedAt: number;
  userId: string;
  autoRestart: boolean;
  restartCount: number;
  previewAvailable: boolean;
  previewUrl: string | null;
  error?: string;
}

const managedProcesses = new Map<string, {
  info: ManagedProcess;
  childProcess: ChildProcess | null;
  restartTimer: NodeJS.Timeout | null;
}>();

const MAX_AUTO_RESTARTS = 3;
const ALLOWED_COMMANDS = new Set([
  'npm', 'npx', 'node', 'pnpm', 'yarn', 'bun',
  'python', 'python3', 'cargo', 'go', 'php', 'vite',
  'sh', 'bash', 'composer', 'make'
]);

async function isProcessDescendant(pid: number, ancestorPid: number): Promise<boolean> {
  let curr: number | null = pid;
  for (let i = 0; i < 5; i++) {
    if (!curr || curr <= 1) break;
    try {
      const status = await fs.readFile(`/proc/${curr}/status`, 'utf-8');
      const match = status.match(/^PPid:\s+(\d+)/m);
      if (!match || !match[1]) break;
      const ppid = parseInt(match[1], 10);
      if (ppid === ancestorPid) return true;
      curr = ppid;
    } catch {
      break;
    }
  }
  return false;
}

export async function getProcesses(workspacePath: string, userId: string): Promise<ManagedProcess[]> {
  const realWorkspace = await fs.realpath(workspacePath).catch(() => workspacePath);
  const networkConnections = await si.networkConnections().catch(() => []);
  const listening = networkConnections.filter(c => c.state === 'LISTEN' && c.pid);

  // Map PIDs to listening ports
  const pidToPorts = new Map<number, number[]>();
  for (const conn of listening) {
    if (!conn.pid || conn.localPort === '3030' || conn.localPort === '5050') continue;
    const portNum = parseInt(conn.localPort, 10);
    if (isNaN(portNum)) continue;
    const existing = pidToPorts.get(conn.pid) || [];
    if (!existing.includes(portNum)) {
      existing.push(portNum);
      pidToPorts.set(conn.pid, existing);
    }
  }

  const result: ManagedProcess[] = [];
  const trackedPids = new Set<number>();

  // 1. Inspect managed processes belonging to this user
  for (const [id, entry] of managedProcesses.entries()) {
    if (entry.info.userId !== userId) continue;

    // Refresh ports if running
    const foundPorts: number[] = [];
    if (entry.info.pid) {
      for (const [listeningPid, ports] of pidToPorts.entries()) {
        if (listeningPid === entry.info.pid || (await isProcessDescendant(listeningPid, entry.info.pid))) {
          for (const p of ports) {
            if (!foundPorts.includes(p)) foundPorts.push(p);
          }
          trackedPids.add(listeningPid);
        }
      }
    }

    if (foundPorts.length > 0) {
      entry.info.ports = foundPorts;
    } else if (entry.info.status === 'running' && !entry.info.pid) {
      entry.info.status = 'unknown';
    }

    entry.info.previewAvailable = entry.info.ports.length > 0;
    entry.info.previewUrl = entry.info.ports.length > 0 ? `http://127.0.0.1:${entry.info.ports[0]}` : null;

    if (entry.info.pid) trackedPids.add(entry.info.pid);
    result.push({ ...entry.info });
  }

  // 2. Discover terminal/unmanaged background processes running within user's workspace
  for (const conn of listening) {
    if (!conn.pid || conn.localPort === '3030' || conn.localPort === '5050') continue;
    if (trackedPids.has(conn.pid)) continue;

    try {
      const rawCwd = await fs.readlink(`/proc/${conn.pid}/cwd`).catch(() => null);
      if (!rawCwd) continue;
      const realCwd = await fs.realpath(rawCwd).catch(() => rawCwd);

      if (realCwd === realWorkspace || realCwd.startsWith(realWorkspace.endsWith(path.sep) ? realWorkspace : realWorkspace + path.sep)) {
        trackedPids.add(conn.pid);
        const ports = pidToPorts.get(conn.pid) || [parseInt(conn.localPort, 10)];
        const procName = conn.process || 'node';

        result.push({
          id: `ext-${conn.pid}`,
          name: procName,
          command: procName,
          args: [],
          cwd: realCwd,
          status: 'running',
          pid: conn.pid,
          ports,
          startedAt: Date.now(),
          userId,
          autoRestart: false,
          restartCount: 0,
          previewAvailable: true,
          previewUrl: `http://127.0.0.1:${ports[0]}`
        });
      }
    } catch {}
  }

  return result;
}

export async function startProcess(
  userId: string,
  workspacePath: string,
  command: string,
  args: string[] = [],
  autoRestart = false
): Promise<ManagedProcess> {
  const safeCwd = await safeResolve(workspacePath);
  const cmdBase = path.basename(command);

  // Security check: command must be allowed executable name or script relative to workspace
  if (!ALLOWED_COMMANDS.has(cmdBase) && !cmdBase.endsWith('.sh') && !cmdBase.endsWith('.js')) {
    throw new Error(`Command "${command}" is not permitted. Allowed: ${Array.from(ALLOWED_COMMANDS).join(', ')}`);
  }

  const id = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const procInfo: ManagedProcess = {
    id,
    name: `${cmdBase} ${args.join(' ')}`.trim(),
    command,
    args,
    cwd: safeCwd,
    status: 'starting',
    pid: null,
    ports: [],
    startedAt: Date.now(),
    userId,
    autoRestart,
    restartCount: 0,
    previewAvailable: false,
    previewUrl: null
  };

  const spawnChild = () => {
    try {
      const child = spawn(command, args, {
        cwd: safeCwd,
        detached: false,
        env: { ...process.env, PORT: undefined }
      });

      procInfo.pid = child.pid || null;
      procInfo.status = child.pid ? 'running' : 'failed';

      child.on('error', (err) => {
        procInfo.status = 'failed';
        procInfo.error = err.message;
      });

      child.on('exit', (code) => {
        const entry = managedProcesses.get(id);
        if (!entry) return;

        procInfo.pid = null;
        procInfo.ports = [];
        procInfo.previewAvailable = false;
        procInfo.previewUrl = null;

        if (entry.info.status === 'stopped') {
          // Explicit user stop
          return;
        }

        if (code === 0) {
          procInfo.status = 'stopped';
        } else {
          procInfo.status = 'failed';
          procInfo.error = `Exited with code ${code}`;

          // Bounded auto restart with exponential backoff
          if (procInfo.autoRestart && procInfo.restartCount < MAX_AUTO_RESTARTS) {
            procInfo.restartCount++;
            procInfo.status = 'restarting';
            const delayMs = Math.min(1000 * Math.pow(2, procInfo.restartCount - 1), 8000);
            entry.restartTimer = setTimeout(() => {
              if (managedProcesses.has(id)) {
                spawnChild();
              }
            }, delayMs);
          }
        }
      });

      managedProcesses.set(id, {
        info: procInfo,
        childProcess: child,
        restartTimer: null
      });
    } catch (e: unknown) {
      procInfo.status = 'failed';
      procInfo.error = e instanceof Error ? e.message : String(e);
      managedProcesses.set(id, {
        info: procInfo,
        childProcess: null,
        restartTimer: null
      });
    }
  };

  spawnChild();
  return procInfo;
}

export async function stopProcess(id: string, userId: string): Promise<boolean> {
  // Check if managed process
  const entry = managedProcesses.get(id);
  if (entry) {
    if (entry.info.userId !== userId) {
      throw new Error('Access denied: Process belongs to another user');
    }

    entry.info.autoRestart = false;
    if (entry.restartTimer) {
      clearTimeout(entry.restartTimer);
      entry.restartTimer = null;
    }

    entry.info.status = 'stopped';
    if (entry.childProcess && entry.childProcess.pid) {
      entry.childProcess.kill('SIGTERM');
      setTimeout(() => {
        if (entry.childProcess && !entry.childProcess.killed) {
          try { entry.childProcess.kill('SIGKILL'); } catch {}
        }
      }, 1500);
    }
    return true;
  }

  // Check if external unmanaged process (`ext-<pid>`)
  if (id.startsWith('ext-')) {
    const pid = parseInt(id.replace('ext-', ''), 10);
    if (!pid || pid <= 1 || pid === process.pid || pid === process.ppid) {
      throw new Error('Invalid or protected PID');
    }

    const rawCwd = await fs.readlink(`/proc/${pid}/cwd`).catch(() => null);
    if (!rawCwd) throw new Error('Process not found');
    const realCwd = await fs.realpath(rawCwd).catch(() => rawCwd);
    const realAllowed = await fs.realpath(ALLOWED_ROOT).catch(() => ALLOWED_ROOT);

    if (realCwd !== realAllowed && !realCwd.startsWith(realAllowed + path.sep)) {
      throw new Error('Cannot terminate process outside workspace');
    }

    try {
      process.kill(pid, 'SIGTERM');
      return true;
    } catch {
      return false;
    }
  }

  throw new Error(`Process ${id} not found`);
}

export async function restartProcess(id: string, userId: string): Promise<ManagedProcess> {
  const entry = managedProcesses.get(id);
  if (!entry) {
    throw new Error(`Process ${id} not found`);
  }

  if (entry.info.userId !== userId) {
    throw new Error('Access denied: Process belongs to another user');
  }

  // Stop current
  if (entry.restartTimer) clearTimeout(entry.restartTimer);
  if (entry.childProcess && entry.childProcess.pid) {
    try { entry.childProcess.kill('SIGTERM'); } catch {}
  }

  entry.info.status = 'restarting';
  entry.info.restartCount = 0;
  entry.info.startedAt = Date.now();

  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const child = spawn(entry.info.command, entry.info.args, {
          cwd: entry.info.cwd,
          detached: false,
          env: { ...process.env, PORT: undefined }
        });

        entry.info.pid = child.pid || null;
        entry.info.status = child.pid ? 'running' : 'failed';
        entry.childProcess = child;
        resolve(entry.info);
      } catch (e: unknown) {
        entry.info.status = 'failed';
        entry.info.error = e instanceof Error ? e.message : String(e);
        resolve(entry.info);
      }
    }, 500);
  });
}
