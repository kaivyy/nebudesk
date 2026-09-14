import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export const ALLOWED_ROOT = process.env.HOME || os.homedir() || '/root';

export async function safeResolve(p: string): Promise<string> {
  let decoded = p;
  while (decoded.includes('%')) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  // Handle empty or user-home aliases
  if (!decoded || decoded === '~' || decoded === 'home') {
    return ALLOWED_ROOT;
  }

  // Seamless migration: if non-root user accesses legacy /root or /root/..., map to user home
  if (ALLOWED_ROOT !== '/root') {
    if (decoded === '/root') {
      return ALLOWED_ROOT;
    }
    if (decoded.startsWith('/root/')) {
      decoded = path.join(ALLOWED_ROOT, decoded.slice(6));
    }
  }

  const targetPath = path.resolve(ALLOWED_ROOT, decoded.replace(/^\//, ''));
  // Handle frontend sending absolute paths like /home/username directly
  const resolvedPath = path.isAbsolute(decoded) ? path.normalize(decoded) : targetPath;
  
  // Basic prefix check first
  if (!resolvedPath.startsWith(ALLOWED_ROOT) || (resolvedPath.length > ALLOWED_ROOT.length && resolvedPath[ALLOWED_ROOT.length] !== path.sep)) {
    throw new Error('Forbidden path traversal');
  }

  try {
    // Resolve symlinks to get the real canonical path
    const realPath = await fs.realpath(resolvedPath);
    // Check if the real path is still inside ALLOWED_ROOT
    if (!realPath.startsWith(ALLOWED_ROOT) || (realPath.length > ALLOWED_ROOT.length && realPath[ALLOWED_ROOT.length] !== path.sep)) {
      throw new Error('Forbidden symlink escape');
    }
    return realPath;
  } catch (e: unknown) {
    // If file doesn't exist, realpath throws ENOENT.
    // That's fine for creating new files. We just return the resolvedPath which passed the basic check.
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === 'ENOENT') {
      return resolvedPath;
    }
    throw e;
  }
}
