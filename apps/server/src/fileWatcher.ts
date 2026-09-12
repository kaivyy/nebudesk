import fs from 'fs';
import path from 'path';

export interface WatcherChangeItem {
  path: string;
  relPath: string;
  parentDir: string;
  event: 'change' | 'create' | 'delete';
}

export interface WatcherBatchMessage {
  type: 'fs.batch';
  workspace: string;
  changes: WatcherChangeItem[];
  gitMayHaveChanged: boolean;
}

interface WorkspaceWatcherSession {
  workspace: string;
  watcher: fs.FSWatcher | null;
  clients: Set<(message: WatcherBatchMessage) => void>;
  pendingEvents: Map<string, { event: 'change' | 'create' | 'delete'; parentDir: string; relPath: string }>;
  debounceTimer: NodeJS.Timeout | null;
  gitMayHaveChanged: boolean;
}

const watchers = new Map<string, WorkspaceWatcherSession>();
const recentSelfWrites = new Map<string, number>();

/**
 * Record a self-write initiated by NebuDesk APIs.
 * Used as an optimization hint to avoid duplicate processing.
 */
export function recordSelfWrite(filePath: string): void {
  const normalized = path.normalize(filePath);
  recentSelfWrites.set(normalized, Date.now());
  // Prune entries older than 5 seconds
  if (recentSelfWrites.size > 200) {
    const now = Date.now();
    for (const [k, timestamp] of recentSelfWrites.entries()) {
      if (now - timestamp > 5000) {
        recentSelfWrites.delete(k);
      }
    }
  }
}

export function isRecentSelfWrite(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  const timestamp = recentSelfWrites.get(normalized);
  if (!timestamp) return false;
  if (Date.now() - timestamp < 2000) {
    return true;
  }
  recentSelfWrites.delete(normalized);
  return false;
}

function shouldIgnorePath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  
  // Ignore git internal objects, logs, refs, but note git changes
  if (
    normalized.startsWith('.git/objects') ||
    normalized.startsWith('.git/logs') ||
    normalized.startsWith('.git/hooks') ||
    normalized.includes('/.git/objects') ||
    normalized.includes('/.git/logs')
  ) {
    return true;
  }

  // Ignore noisy runtime folders and build artifacts
  if (
    normalized.includes('node_modules/') ||
    normalized === 'node_modules' ||
    normalized.includes('dist/') ||
    normalized === 'dist' ||
    normalized.includes('build/') ||
    normalized === 'build' ||
    normalized.includes('.gemini/') ||
    normalized.includes('graphify-out/') ||
    normalized.endsWith('.db') ||
    normalized.endsWith('.db-wal') ||
    normalized.endsWith('.db-shm') ||
    normalized.endsWith('.db-journal') ||
    normalized.endsWith('.tmp') ||
    normalized.endsWith('~') ||
    normalized.endsWith('.swp') ||
    normalized.endsWith('.DS_Store')
  ) {
    return true;
  }

  return false;
}

function flushBatch(session: WorkspaceWatcherSession): void {
  session.debounceTimer = null;
  if (session.pendingEvents.size === 0 && !session.gitMayHaveChanged) {
    return;
  }

  const changes: WatcherChangeItem[] = [];
  for (const [absPath, data] of session.pendingEvents.entries()) {
    changes.push({
      path: absPath,
      relPath: data.relPath,
      parentDir: data.parentDir,
      event: data.event
    });
  }

  const message: WatcherBatchMessage = {
    type: 'fs.batch',
    workspace: session.workspace,
    changes,
    gitMayHaveChanged: session.gitMayHaveChanged
  };

  // Reset batch collection
  session.pendingEvents.clear();
  session.gitMayHaveChanged = false;

  // Broadcast to all active clients for this workspace
  for (const clientCallback of session.clients) {
    try {
      clientCallback(message);
    } catch {
      // Ignore broken client callback, will be pruned on disconnect
    }
  }
}

function handleRawFsEvent(session: WorkspaceWatcherSession, eventType: string, filename: string | null): void {
  if (!filename) return;

  const normalizedRel = path.normalize(filename);

  // Check if it is a git change (e.g., .git/index, .git/HEAD)
  if (normalizedRel.startsWith('.git') || normalizedRel.includes('/.git')) {
    if (
      normalizedRel.endsWith('.git/index') ||
      normalizedRel.endsWith('.git/HEAD') ||
      normalizedRel.endsWith('.git/config') ||
      normalizedRel === '.git'
    ) {
      session.gitMayHaveChanged = true;
      if (!session.debounceTimer) {
        session.debounceTimer = setTimeout(() => flushBatch(session), 80);
      }
    }
    return;
  }

  if (shouldIgnorePath(normalizedRel)) {
    return;
  }

  const absPath = path.join(session.workspace, normalizedRel);
  const parentDir = path.dirname(absPath);

  // Determine existence to classify create vs delete vs change
  let event: 'change' | 'create' | 'delete' = 'change';
  try {
    if (fs.existsSync(absPath)) {
      if (eventType === 'rename') {
        event = 'create';
      } else {
        event = 'change';
      }
    } else {
      event = 'delete';
    }
  } catch {
    event = 'delete';
  }

  // If already registered as 'create' in this pending un-flushed batch, keep 'create'
  const existing = session.pendingEvents.get(absPath);
  if (existing && existing.event === 'create' && event === 'change') {
    event = 'create';
  }

  session.pendingEvents.set(absPath, { event, parentDir, relPath: normalizedRel });
  session.gitMayHaveChanged = true;

  if (session.debounceTimer) {
    clearTimeout(session.debounceTimer);
  }
  session.debounceTimer = setTimeout(() => flushBatch(session), 80);
}

/**
 * Subscribe a client callback to changes within a workspace directory.
 * Watchers are shared per workspace and reference-counted.
 */
export function subscribeWorkspaceWatcher(
  workspace: string,
  onBatch: (message: WatcherBatchMessage) => void
): () => void {
  const normalizedWorkspace = path.resolve(workspace);

  let session = watchers.get(normalizedWorkspace);
  if (!session) {
    session = {
      workspace: normalizedWorkspace,
      watcher: null,
      clients: new Set(),
      pendingEvents: new Map(),
      debounceTimer: null,
      gitMayHaveChanged: false
    };

    try {
      session.watcher = fs.watch(
        normalizedWorkspace,
        { recursive: true },
        (eventType, filename) => {
          const currentSession = watchers.get(normalizedWorkspace);
          if (currentSession) {
            handleRawFsEvent(currentSession, eventType, filename);
          }
        }
      );

      session.watcher.on('error', () => {
        // Handle watcher error gracefully
      });
    } catch {
      // If recursive watching fails on this folder, session.watcher remains null
    }

    watchers.set(normalizedWorkspace, session);
  }

  session.clients.add(onBatch);

  // Return unsubscribe cleanup function
  return () => {
    const currentSession = watchers.get(normalizedWorkspace);
    if (!currentSession) return;

    currentSession.clients.delete(onBatch);

    if (currentSession.clients.size === 0) {
      if (currentSession.debounceTimer) {
        clearTimeout(currentSession.debounceTimer);
        currentSession.debounceTimer = null;
      }
      if (currentSession.watcher) {
        try {
          currentSession.watcher.close();
        } catch {
          // ignore
        }
        currentSession.watcher = null;
      }
      watchers.delete(normalizedWorkspace);
    }
  };
}

export function getActiveWatchersCount(): number {
  return watchers.size;
}
