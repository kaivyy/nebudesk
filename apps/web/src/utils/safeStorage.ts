/**
 * NebuDesk SafeStorage - Advanced Workspace Persistence & Corruption Recovery
 * 
 * Features:
 * - Security sanitization: rejects sensitive keys (tokens, passwords, secrets, credentials)
 * - Corruption recovery: gracefully handles invalid JSON, circular structures, or unexpected types
 * - Size bounded: prevents quota exhaustion by enforcing a 500KB cap per entry
 * - Workspace isolation: helper for namespacing workspace state
 */

const SENSITIVE_KEY_PATTERN = /^(?=.*(token|password|jwt|secret|credential|passwd|auth_header))(?!(nebucode_|workspace_)).*$/i;
const MAX_ITEM_SIZE = 500 * 1024; // 500 KB cap

export const safeStorage = {
  /**
   * Retrieves a typed value with automatic JSON parsing, type validation, and fallback on corruption.
   */
  getItem<T>(key: string, fallback: T, validator?: (val: unknown) => boolean): T {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;

      // Check size limit
      if (raw.length > MAX_ITEM_SIZE) {
        console.warn(`[SafeStorage] Entry "${key}" exceeded size limit (${raw.length} bytes). Purging.`);
        localStorage.removeItem(key);
        return fallback;
      }

      const parsed = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        console.warn(`[SafeStorage] Entry "${key}" failed schema validation. Resetting to fallback.`);
        localStorage.removeItem(key);
        return fallback;
      }

      return parsed as T;
    } catch {
      console.warn(`[SafeStorage] Corrupted data for key "${key}". Gracefully purging.`);
      try { localStorage.removeItem(key); } catch {}
      return fallback;
    }
  },

  /**
   * Safely serializes and stores a value, rejecting sensitive keys and oversized values.
   */
  setItem<T>(key: string, value: T): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;

      // Security sanitization check
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        console.error(`[SafeStorage] Security violation: Attempted to persist sensitive key "${key}". Blocked.`);
        return false;
      }

      const serialized = JSON.stringify(value);
      if (serialized.length > MAX_ITEM_SIZE) {
        console.warn(`[SafeStorage] Cannot store "${key}": serialized size (${serialized.length} bytes) exceeds 500KB limit.`);
        return false;
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.warn(`[SafeStorage] Failed to store key "${key}":`, e);
      return false;
    }
  },

  /**
   * Retrieves a plain string with fallback.
   */
  getString(key: string, fallback: string): string {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Sets a plain string with security and size validation.
   */
  setString(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        console.error(`[SafeStorage] Security violation: Attempted to persist sensitive string key "${key}". Blocked.`);
        return false;
      }
      if (value.length > MAX_ITEM_SIZE) {
        console.warn(`[SafeStorage] Cannot store string "${key}": size exceeds 500KB.`);
        return false;
      }
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Removes an item safely.
   */
  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.removeItem(key);
    } catch {}
  },

  /**
   * Workspace-scoped key generator to guarantee workspace isolation.
   */
  getWorkspaceKey(workspace: string, suffix: string, winId?: string): string {
    const slug = encodeURIComponent(workspace.replace(/[/\\:]/g, '_'));
    return winId ? `nebucode_ws_${slug}_${winId}_${suffix}` : `nebucode_ws_${slug}_${suffix}`;
  },

  /**
   * Saves an unsaved draft buffer for crash/reload recovery.
   */
  saveDraft(workspace: string, filePath: string, content: string, winId?: string): boolean {
    const key = this.getWorkspaceKey(workspace, `draft_${encodeURIComponent(filePath.replace(/[/\\:]/g, '_'))}`, winId);
    return this.setString(key, content);
  },

  /**
   * Retrieves an unsaved draft buffer if one exists.
   */
  getDraft(workspace: string, filePath: string, winId?: string): string | null {
    const key = this.getWorkspaceKey(workspace, `draft_${encodeURIComponent(filePath.replace(/[/\\:]/g, '_'))}`, winId);
    const draft = this.getString(key, '');
    return draft.length > 0 ? draft : null;
  },

  /**
   * Clears an unsaved draft once saved or discarded.
   */
  clearDraft(workspace: string, filePath: string, winId?: string): void {
    const key = this.getWorkspaceKey(workspace, `draft_${encodeURIComponent(filePath.replace(/[/\\:]/g, '_'))}`, winId);
    this.removeItem(key);
  },

  /**
   * Exports non-sensitive workspace configuration as a clean JSON string.
   * Excludes any secrets, passwords, tokens, or private credentials.
   */
  exportWorkspace(workspace: string, winId?: string): string {
    const keys = ['open_files', 'recent_files', 'expanded', 'split_file', 'split_orient', 'cursor_positions'];
    const exportData: Record<string, unknown> = {
      version: 1,
      workspace,
      exportedAt: new Date().toISOString()
    };

    for (const key of keys) {
      const fullKey = this.getWorkspaceKey(workspace, key, winId);
      const val = this.getItem(fullKey, null);
      if (val !== null) {
        exportData[key] = val;
      }
    }

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Imports workspace configuration from a verified JSON string.
   */
  importWorkspace(workspace: string, jsonStr: string, winId?: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;

      const keys = ['open_files', 'recent_files', 'expanded', 'split_file', 'split_orient', 'cursor_positions'];
      for (const key of keys) {
        if (key in parsed) {
          const fullKey = this.getWorkspaceKey(workspace, key, winId);
          this.setItem(fullKey, parsed[key]);
        }
      }
      return true;
    } catch {
      return false;
    }
  }
};
