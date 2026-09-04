
import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
import { safeResolve } from './pathUtils.js';
import { detectProject } from './projectDetector.js';
import { getProcesses, startProcess, stopProcess, restartProcess } from './processManager.js';
import { parseDiagnostics } from './diagnosticsParser.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const execFilePromise = util.promisify(execFile);

const gitExec = async (args: string[], cwd: string, timeout = 15000) => {
  return execFilePromise('git', args, {
    cwd,
    timeout,
    maxBuffer: 5 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  });
};

const resolveWithinWorkspace = async (workspacePath: string, relPath: string): Promise<string> => {
  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Invalid file path');
  }
  if (path.isAbsolute(relPath) || relPath.includes('..')) {
    throw new Error('Path traversal detected');
  }
  const fullPath = path.join(workspacePath, path.normalize(relPath));
  const resolved = await safeResolve(fullPath);
  if (!resolved.startsWith(workspacePath)) {
    throw new Error('Path escapes workspace root');
  }
  return resolved;
};

export default function registerExtensions(fastify: FastifyInstance, _: string) {
  fastify.get('/api/git/status', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/' } = request.query as { p: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    try {
      await gitExec(['rev-parse', '--is-inside-work-tree'], targetPath, 5000);
    } catch {
      return {
        isRepo: false,
        notRepo: true,
        branch: '',
        branches: [],
        files: [],
        staged: [],
        unstaged: [],
        untracked: [],
        clean: true
      };
    }

    try {
      let branch = '';
      try {
        const { stdout: branchOut } = await gitExec(['rev-parse', '--abbrev-ref', 'HEAD'], targetPath);
        branch = branchOut.trim();
      } catch {
        branch = 'HEAD (unborn)';
      }

      let branches: string[] = [];
      try {
        const { stdout: branchListOut } = await gitExec(['branch', '--list', '--no-color'], targetPath);
        branches = branchListOut
          .split('\n')
          .map(b => b.replace(/^[* ]\s*/, '').trim())
          .filter(Boolean);
      } catch {}

      const { stdout: statusOut } = await gitExec(['status', '--porcelain=v1', '-uall'], targetPath);
      const lines = statusOut.split('\n').filter(Boolean);

      const files: Array<{ status: string; file: string }> = [];
      const staged: Array<{ file: string; status: string }> = [];
      const unstaged: Array<{ file: string; status: string }> = [];
      const untracked: Array<{ file: string; status: string }> = [];

      for (const line of lines) {
        if (line.length < 4) continue;
        const x = line[0];
        const y = line[1];
        const file = line.substring(3).trim();

        files.push({ status: `${x}${y}`, file });

        if (x === '?' && y === '?') {
          untracked.push({ file, status: '?' });
        } else {
          if (x && x !== ' ' && x !== '?') {
            staged.push({ file, status: x });
          }
          if (y && y !== ' ' && y !== '?') {
            unstaged.push({ file, status: y });
          }
        }
      }

      const clean = staged.length === 0 && unstaged.length === 0 && untracked.length === 0;

      return {
        isRepo: true,
        branch,
        branches,
        files,
        staged,
        unstaged,
        untracked,
        clean
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message, notRepo: false });
    }
  });

  fastify.get('/api/git/diff', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', file, staged = 'false' } = request.query as { p: string; file?: string; staged?: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }

    const args: string[] = ['diff', '--no-color', '-U3'];
    if (staged === 'true') {
      args.push('--cached');
    }

    if (file) {
      try {
        await resolveWithinWorkspace(targetPath, file);
      } catch (e: unknown) {
        return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
      }
      args.push('--', file);
    }

    try {
      const { stdout } = await gitExec(args, targetPath);
      let diffText = stdout;

      if (!diffText && file && staged !== 'true') {
        try {
          const filePath = path.join(targetPath, file);
          const stat = await fs.stat(filePath);
          if (stat.isFile() && stat.size < 500 * 1024) {
            const { stdout: checkUntracked } = await gitExec(['ls-files', '--others', '--exclude-standard', '--', file], targetPath);
            if (checkUntracked.trim() === file) {
              const content = await fs.readFile(filePath, 'utf8');
              const lines = content.split('\n');
              diffText = `--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n` + lines.map(l => `+${l}`).join('\n');
            }
          }
        } catch {}
      }

      return { diff: diffText, file: file || null, staged: staged === 'true' };
    } catch (err: unknown) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.post('/api/git/stage', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', file, all = false } = request.body as { p: string; file?: string; all?: boolean };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }

    try {
      if (all) {
        await gitExec(['add', '-A'], targetPath);
      } else if (file) {
        await resolveWithinWorkspace(targetPath, file);
        await gitExec(['add', '--', file], targetPath);
      } else {
        return reply.status(400).send({ error: 'Either "all" or "file" must be provided' });
      }
      return { success: true };
    } catch (err: unknown) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.post('/api/git/unstage', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', file, all = false } = request.body as { p: string; file?: string; all?: boolean };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }

    try {
      if (all) {
        try {
          await gitExec(['restore', '--staged', '.'], targetPath);
        } catch {
          await gitExec(['reset', 'HEAD'], targetPath);
        }
      } else if (file) {
        await resolveWithinWorkspace(targetPath, file);
        try {
          await gitExec(['restore', '--staged', '--', file], targetPath);
        } catch {
          await gitExec(['reset', 'HEAD', '--', file], targetPath);
        }
      } else {
        return reply.status(400).send({ error: 'Either "all" or "file" must be provided' });
      }
      return { success: true };
    } catch (err: unknown) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.post('/api/git/discard', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', file } = request.body as { p: string; file: string };
    if (!file) {
      return reply.status(400).send({ error: 'file parameter is required' });
    }
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
      await resolveWithinWorkspace(targetPath, file);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }

    try {
      const { stdout: checkUntracked } = await gitExec(['ls-files', '--others', '--exclude-standard', '--', file], targetPath);
      if (checkUntracked.trim() === file) {
        await gitExec(['clean', '-f', '--', file], targetPath);
      } else {
        try {
          await gitExec(['restore', '--', file], targetPath);
        } catch {
          await gitExec(['checkout', '--', file], targetPath);
        }
      }
      return { success: true };
    } catch (err: unknown) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.post('/api/git/commit', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', message } = request.body as { p: string; message: string };
    if (!message || typeof message !== 'string' || !message.trim()) {
      return reply.status(400).send({ error: 'Commit message is required' });
    }
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }

    try {
      const { stdout } = await gitExec(['commit', '-m', message.trim()], targetPath);
      return { success: true, stdout };
    } catch (err: unknown) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.get('/api/git/branches', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/' } = request.query as { p: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }

    try {
      let current = '';
      try {
        const { stdout: branchOut } = await gitExec(['rev-parse', '--abbrev-ref', 'HEAD'], targetPath);
        current = branchOut.trim();
      } catch {}

      const { stdout: branchListOut } = await gitExec(['branch', '--list', '--no-color'], targetPath);
      const branches = branchListOut
        .split('\n')
        .map(b => b.replace(/^[* ]\s*/, '').trim())
        .filter(Boolean);

      return { current, branches };
    } catch (err: unknown) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.post('/api/git/checkout', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', branch, create = false } = request.body as { p: string; branch: string; create?: boolean };
    if (!branch || typeof branch !== 'string' || !/^[a-zA-Z0-9._/-]+$/.test(branch)) {
      return reply.status(400).send({ error: 'Valid branch name is required' });
    }
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }

    try {
      const args = create ? ['checkout', '-b', branch] : ['checkout', branch];
      await gitExec(args, targetPath);
      return { success: true, branch };
    } catch (err: unknown) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.post('/api/git/pull', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/' } = request.body as { p: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
    try {
      const { stdout } = await gitExec(['pull'], targetPath, 25000);
      return { success: true, stdout };
    } catch (err: unknown) {
      const sanitized = (err instanceof Error ? err.message : String(err)).replace(/https:\/\/[^:]+:[^@]+@/g, 'https://***:***@');
      return reply.status(400).send({ error: sanitized });
    }
  });

  fastify.post('/api/git/push', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/' } = request.body as { p: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
    try {
      const { stdout } = await gitExec(['push'], targetPath, 25000);
      return { success: true, stdout };
    } catch (err: unknown) {
      const sanitized = (err instanceof Error ? err.message : String(err)).replace(/https:\/\/[^:]+:[^@]+@/g, 'https://***:***@');
      return reply.status(400).send({ error: sanitized });
    }
  });

  fastify.post('/api/git/fetch', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/' } = request.body as { p: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
    try {
      const { stdout } = await gitExec(['fetch'], targetPath, 25000);
      return { success: true, stdout };
    } catch (err: unknown) {
      const sanitized = (err instanceof Error ? err.message : String(err)).replace(/https:\/\/[^:]+:[^@]+@/g, 'https://***:***@');
      return reply.status(400).send({ error: sanitized });
    }
  });

  fastify.post('/api/git/init', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/' } = request.body as { p: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
    try {
      await gitExec(['init', '-b', 'main'], targetPath);
      return { success: true };
    } catch (err: unknown) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  fastify.get('/api/files/search', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', q = '' } = request.query as { p: string, q: string };
    if (!q || q.length < 2) return { results: [] };
    
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }
    
    try {
      // Find files matching query (case insensitive), max depth 5 to prevent lag, exclude node_modules and .git
      // Use execFile to avoid command injection
      const { stdout } = await execFilePromise('find', [
        targetPath,
        '-maxdepth', '5',
        '-type', 'd',
        '(', '-name', 'node_modules', '-o', '-name', '.git', ')',
        '-prune',
        '-o',
        '-type', 'f',
        '-iname', `*${q}*`,
        '-print'
      ]);
      const results = stdout.split('\n').filter(Boolean).slice(0, 50).map(f => {
        // Find relative path from ALLOWED_ROOT using the safe path module
        return path.relative(targetPath, f);
      });
      return { results };
    } catch (err: unknown) {
      // find returns non-zero if it encounters permission denied on some subdirs, just ignore stderr if stdout exists
      if (typeof err === 'object' && err !== null && 'stdout' in err && typeof (err as { stdout: unknown }).stdout === 'string') {
        const stdoutStr = (err as { stdout: string }).stdout;
        const results = stdoutStr.split('\n').filter(Boolean).slice(0, 50).map((f: string) => {
          return path.relative(targetPath, f);
        });
        return { results };
      }
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  fastify.get('/api/files/grep', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', q = '', caseSensitive = 'false', isRegex = 'false', maxResults = '100' } = request.query as { 
      p?: string; 
      q?: string; 
      caseSensitive?: string; 
      isRegex?: string; 
      maxResults?: string;
    };
    if (!q || q.length < 2) return { results: [] };

    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    const limit = Math.min(Math.max(1, parseInt(maxResults, 10) || 50), 200);

    const rgArgs = [
      '-n',
      '--column',
      '--no-heading',
      '--color=never',
      `--max-count=${limit}`,
      '--max-filesize=2M',
      '-g', '!node_modules',
      '-g', '!.git',
      '-g', '!dist',
      '-g', '!build',
      '-g', '!dev.db*',
      '-g', '!*.log',
      ...(caseSensitive === 'true' ? [] : ['-i']),
      ...(isRegex === 'true' ? [] : ['-F']),
      '--',
      q,
      targetPath
    ];

    try {
      const { stdout } = await execFilePromise('rg', rgArgs, { maxBuffer: 10 * 1024 * 1024 });
      const lines = stdout.split('\n').filter(Boolean);
      const results: Array<{ file: string; line: number; column: number; preview: string }> = [];

      for (const line of lines) {
        if (results.length >= limit) break;
        const prefix = targetPath.endsWith('/') ? targetPath : targetPath + '/';
        let remaining = line;
        if (line.startsWith(prefix)) {
          remaining = line.slice(prefix.length);
        } else if (line.startsWith(targetPath)) {
          remaining = line.slice(targetPath.length).replace(/^\//, '');
        }

        const match = remaining.match(/^([^:]+):(\d+):(\d+):(.*)$/);
        if (match && match[1] && match[2] && match[3] && match[4] !== undefined) {
          const file = match[1];
          const lineNum = parseInt(match[2], 10);
          const colNum = parseInt(match[3], 10);
          const preview = match[4].trim().slice(0, 200);
          results.push({ file, line: lineNum, column: colNum, preview });
        }
      }

      return { results };
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number | string }).code === 1) {
        return { results: [] };
      }
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number | string }).code === 2) {
        return reply.status(400).send({ error: 'Invalid regular expression or query syntax' });
      }
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  fastify.post('/api/files/replace-in-files', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', q, replaceWith = '', files = [] } = request.body as {
      p?: string;
      q: string;
      replaceWith?: string;
      files?: string[];
    };

    if (!q || typeof q !== 'string') {
      return reply.status(400).send({ error: 'Search query q is required' });
    }

    let targetDir: string;
    try {
      targetDir = await safeResolve(p);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    const modifiedFiles: string[] = [];
    let totalReplacements = 0;

    const uniqueFiles = Array.from(new Set(Array.isArray(files) ? files : []))
      .filter((f): f is string => typeof f === 'string' && f.trim().length > 0);
    const filesToProcess = uniqueFiles.slice(0, 50);
    if (filesToProcess.length === 0) {
      return reply.status(400).send({ error: 'files array must not be empty' });
    }

    for (const relFile of filesToProcess) {
      if (typeof relFile !== 'string') continue;
      let targetFile: string;
      try {
        targetFile = await safeResolve(path.join(targetDir, relFile));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return reply.status(403).send({ error: message });
      }

      try {
        const content = await fs.readFile(targetFile, 'utf8');
        if (content.includes(q)) {
          const parts = content.split(q);
          const occurrences = parts.length - 1;
          const newContent = parts.join(replaceWith);
          await fs.writeFile(targetFile, newContent, 'utf8');
          modifiedFiles.push(relFile);
          totalReplacements += occurrences;
        }
      } catch {}
    }

    return { success: true, count: totalReplacements, filesModified: modifiedFiles };
  });

  fastify.get('/api/project/detect', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query || {}) as { p?: string; workspace?: string };
    const p = query.p || query.workspace || '/';
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    try {
      const projectInfo = await detectProject(targetPath);
      return projectInfo;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // P15 Process & Preview 2.0
  fastify.get('/api/workspace/processes', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspace = '/' } = request.query as { workspace?: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(workspace);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    try {
      const user = request.user as { id: string };
      const processes = await getProcesses(targetPath, user.id);
      return { processes };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  fastify.post('/api/workspace/processes/start', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { command, args = [], cwd = '/', autoRestart = false } = request.body as {
      command: string;
      args?: string[];
      cwd?: string;
      autoRestart?: boolean;
    };

    if (!command || typeof command !== 'string' || !command.trim()) {
      return reply.status(400).send({ error: 'Valid command is required' });
    }

    let targetPath: string;
    try {
      targetPath = await safeResolve(cwd);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    try {
      const user = request.user as { id: string };
      const proc = await startProcess(user.id, targetPath, command.trim(), Array.isArray(args) ? args : [], Boolean(autoRestart));
      return { success: true, process: proc };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  fastify.post('/api/workspace/processes/stop', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.body as { id: string };
    if (!id || typeof id !== 'string') {
      return reply.status(400).send({ error: 'Process id is required' });
    }

    try {
      const user = request.user as { id: string };
      await stopProcess(id, user.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(403).send({ error: message });
    }
  });

  fastify.post('/api/workspace/processes/restart', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.body as { id: string };
    if (!id || typeof id !== 'string') {
      return reply.status(400).send({ error: 'Process id is required' });
    }

    try {
      const user = request.user as { id: string };
      const proc = await restartProcess(id, user.id);
      return { success: true, process: proc };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(403).send({ error: message });
    }
  });

  fastify.get('/api/preview/targets', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspace = '/' } = request.query as { workspace?: string };
    let targetPath: string;
    try {
      targetPath = await safeResolve(workspace);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    try {
      const user = request.user as { id: string };
      const processes = await getProcesses(targetPath, user.id);
      const previews = processes
        .filter(p => p.previewAvailable && p.previewUrl)
        .map(p => ({
          id: p.id,
          name: p.name,
          command: p.command,
          port: p.ports[0],
          previewUrl: p.previewUrl,
          status: p.status,
          pid: p.pid
        }));

      return { previews };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // --- P16: DEVELOPER COMMAND CENTER ---

  fastify.get('/api/command-center/summary', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query || {}) as { p?: string; workspace?: string };
    const p = query.p || query.workspace || '/';
    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    try {
      const user = request.user as { id: string };

      // 1. Detect Project Awareness
      const project = await detectProject(targetPath);

      // 2. Detect Git Status
      let git = {
        isRepo: false,
        currentBranch: '',
        stagedCount: 0,
        unstagedCount: 0,
        untrackedCount: 0,
        isClean: true
      };
      try {
        const { stdout: branchOut } = await gitExec(['branch', '--show-current'], targetPath, 3000);
        const { stdout: statusOut } = await gitExec(['status', '--porcelain'], targetPath, 3000);
        const branch = branchOut.trim() || 'HEAD';
        let staged = 0;
        let unstaged = 0;
        let untracked = 0;
        for (const line of statusOut.split('\n')) {
          if (!line.trim()) continue;
          const x = line[0];
          const y = line[1];
          if (x === '?' && y === '?') {
            untracked++;
          } else {
            if (x !== ' ' && x !== '?') staged++;
            if (y !== ' ' && y !== '?') unstaged++;
          }
        }
        git = {
          isRepo: true,
          currentBranch: branch,
          stagedCount: staged,
          unstagedCount: unstaged,
          untrackedCount: untracked,
          isClean: staged === 0 && unstaged === 0 && untracked === 0
        };
      } catch {
        // Not a git repo or git error
      }

      // 3. Managed Processes for this user & workspace
      const processes = await getProcesses(targetPath, user.id);

      // 4. Preview targets
      const previews = processes
        .filter(proc => proc.previewAvailable && proc.previewUrl)
        .map(proc => ({
          id: proc.id,
          name: proc.name,
          port: proc.ports[0],
          previewUrl: proc.previewUrl,
          status: proc.status
        }));

      // 5. Actions list
      const pm = project.packageManager || 'npm';
      const scripts = project.scripts || {};

      const parseCmd = (str: string | null): { command: string; args: string[] } | null => {
        if (!str) return null;
        const parts = str.trim().split(/\s+/);
        if (!parts[0]) return null;
        return { command: parts[0], args: parts.slice(1) };
      };

      interface ActionItem {
        id: string;
        label: string;
        command: string;
        args: string[];
        isConfigured: boolean;
        isRunning: boolean;
        processId?: string;
      }

      const actions: ActionItem[] = [];

      // Dev action
      const devParsed = parseCmd(project.devCommand);
      const devAction: ActionItem = {
        id: 'dev',
        label: 'Run Dev Server',
        command: devParsed ? devParsed.command : pm,
        args: devParsed ? devParsed.args : (pm === 'npm' ? ['run', 'dev'] : ['dev']),
        isConfigured: Boolean(project.devCommand || scripts['dev'] || scripts['start']),
        isRunning: false
      };
      actions.push(devAction);

      // Build action
      const buildParsed = parseCmd(project.buildCommand);
      const buildAction: ActionItem = {
        id: 'build',
        label: 'Build Project',
        command: buildParsed ? buildParsed.command : pm,
        args: buildParsed ? buildParsed.args : (pm === 'npm' ? ['run', 'build'] : ['build']),
        isConfigured: Boolean(project.buildCommand || scripts['build']),
        isRunning: false
      };
      actions.push(buildAction);

      // Test action
      const testParsed = parseCmd(project.testCommand);
      const testAction: ActionItem = {
        id: 'test',
        label: 'Run Tests',
        command: testParsed ? testParsed.command : pm,
        args: testParsed ? testParsed.args : ['test'],
        isConfigured: Boolean(project.testCommand || scripts['test']),
        isRunning: false
      };
      actions.push(testAction);

      // Lint action
      const lintAction: ActionItem = {
        id: 'lint',
        label: 'Run Linter',
        command: pm,
        args: pm === 'npm' ? ['run', 'lint'] : ['lint'],
        isConfigured: Boolean(scripts['lint']),
        isRunning: false
      };
      actions.push(lintAction);

      // Additional custom scripts
      for (const [sName] of Object.entries(scripts)) {
        if (['dev', 'start', 'build', 'test', 'lint'].includes(sName)) continue;
        actions.push({
          id: sName,
          label: `Script: ${sName}`,
          command: pm,
          args: pm === 'npm' ? ['run', sName] : [sName],
          isConfigured: true,
          isRunning: false
        });
      }

      // Check running status for actions against active processes
      for (const act of actions) {
        const runningProc = processes.find(p => 
          (p.status === 'running' || p.status === 'starting') &&
          (p.name.includes(act.id) || (p.command === act.command && p.args.join(' ') === act.args.join(' ')))
        );
        if (runningProc) {
          act.isRunning = true;
          act.processId = runningProc.id;
        }
      }

      return {
        workspace: targetPath,
        project,
        git,
        processes,
        previews,
        actions
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  fastify.post('/api/command-center/run-action', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { p = '/', actionId, customCommand, customArgs = [] } = request.body as {
      p?: string;
      actionId: string;
      customCommand?: string;
      customArgs?: string[];
    };

    if (!actionId || typeof actionId !== 'string') {
      return reply.status(400).send({ error: 'actionId is required' });
    }

    let targetPath: string;
    try {
      targetPath = await safeResolve(p);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    try {
      const user = request.user as { id: string };
      const project = await detectProject(targetPath);
      const pm = project.packageManager || 'npm';
      const scripts = project.scripts || {};

      let commandToRun = '';
      let argsToRun: string[] = [];

      if (customCommand) {
        commandToRun = customCommand;
        argsToRun = Array.isArray(customArgs) ? customArgs : [];
      } else if (actionId === 'dev') {
        if (project.devCommand) {
          const parts = project.devCommand.trim().split(/\s+/);
          commandToRun = parts[0] || 'npm';
          argsToRun = parts.slice(1);
        } else if (scripts['dev']) {
          commandToRun = pm;
          argsToRun = pm === 'npm' ? ['run', 'dev'] : ['dev'];
        } else if (scripts['start']) {
          commandToRun = pm;
          argsToRun = pm === 'npm' ? ['start'] : ['start'];
        } else {
          return reply.status(400).send({ error: 'Action "dev" is not configured for this project' });
        }
      } else if (actionId === 'build') {
        if (project.buildCommand) {
          const parts = project.buildCommand.trim().split(/\s+/);
          commandToRun = parts[0] || 'npm';
          argsToRun = parts.slice(1);
        } else if (scripts['build']) {
          commandToRun = pm;
          argsToRun = pm === 'npm' ? ['run', 'build'] : ['build'];
        } else {
          return reply.status(400).send({ error: 'Action "build" is not configured for this project' });
        }
      } else if (actionId === 'test') {
        if (project.testCommand) {
          const parts = project.testCommand.trim().split(/\s+/);
          commandToRun = parts[0] || 'npm';
          argsToRun = parts.slice(1);
        } else if (scripts['test']) {
          commandToRun = pm;
          argsToRun = ['test'];
        } else {
          return reply.status(400).send({ error: 'Action "test" is not configured for this project' });
        }
      } else if (actionId === 'lint') {
        if (scripts['lint']) {
          commandToRun = pm;
          argsToRun = pm === 'npm' ? ['run', 'lint'] : ['lint'];
        } else {
          return reply.status(400).send({ error: 'Action "lint" is not configured for this project' });
        }
      } else if (scripts[actionId]) {
        commandToRun = pm;
        argsToRun = pm === 'npm' ? ['run', actionId] : [actionId];
      } else {
        return reply.status(400).send({ error: `Action "${actionId}" is not configured for this project` });
      }

      const proc = await startProcess(user.id, targetPath, commandToRun, argsToRun, false);
      return { success: true, process: proc };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  fastify.post('/api/command-center/stop-action', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { processId } = request.body as { processId: string };
    if (!processId || typeof processId !== 'string') {
      return reply.status(400).send({ error: 'processId is required' });
    }

    try {
      const user = request.user as { id: string };
      await stopProcess(processId, user.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(403).send({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // P18: Diagnostics & Problems Endpoints
  // ---------------------------------------------------------------------------

  fastify.post('/api/diagnostics/parse', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { output, workspace } = (request.body || {}) as { output?: string; workspace?: string };
    if (typeof output !== 'string') {
      return reply.status(400).send({ error: 'output string is required' });
    }

    let targetWs = workspace;
    if (targetWs) {
      try {
        targetWs = await safeResolve(targetWs);
      } catch {
        targetWs = undefined;
      }
    }

    const parsed = parseDiagnostics(output, targetWs);
    return {
      success: true,
      diagnostics: parsed.diagnostics,
      summary: parsed.summary
    };
  });

  const ALLOWED_DIAGNOSTIC_BINS = new Set([
    'npm', 'npx', 'pnpm', 'yarn', 'tsc', 'eslint', 'cargo', 'python', 'python3', 'go', 'flake8', 'mypy', 'pytest'
  ]);
  const SHELL_META_REGEX = /[;&|><$`\\]/;

  fastify.post('/api/diagnostics/run', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspace = '/', tool = 'auto', command } = (request.body || {}) as {
      workspace?: string;
      tool?: 'auto' | 'tsc' | 'eslint' | 'cargo' | 'python' | 'go' | 'custom';
      command?: string;
    };

    let targetPath: string;
    try {
      targetPath = await safeResolve(workspace);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(403).send({ error: message });
    }

    let cmd: string;
    let args: string[];

    if (command && typeof command === 'string') {
      const trimmed = command.trim();
      if (SHELL_META_REGEX.test(trimmed)) {
        return reply.status(400).send({ error: 'Shell metacharacters are forbidden' });
      }
      const parts = trimmed.split(/\s+/).filter(Boolean);
      if (parts.length === 0) {
        return reply.status(400).send({ error: 'Empty command provided' });
      }
      cmd = parts[0]!;
      if (!ALLOWED_DIAGNOSTIC_BINS.has(cmd)) {
        return reply.status(400).send({ error: `Command "${cmd}" is not in allowed diagnostic tools whitelist` });
      }
      args = parts.slice(1);
    } else {
      switch (tool) {
        case 'tsc':
          cmd = 'npx';
          args = ['tsc', '--noEmit'];
          break;
        case 'eslint':
          cmd = 'npx';
          args = ['eslint', '.'];
          break;
        case 'cargo':
          cmd = 'cargo';
          args = ['check', '--message-format=short'];
          break;
        case 'python':
          cmd = 'python3';
          args = ['-m', 'py_compile'];
          break;
        case 'go':
          cmd = 'go';
          args = ['vet', './...'];
          break;
        case 'auto':
        default: {
          const project = await detectProject(targetPath);
          if (project.ecosystems.includes('rust')) {
            cmd = 'cargo';
            args = ['check', '--message-format=short'];
          } else if (project.ecosystems.includes('go')) {
            cmd = 'go';
            args = ['vet', './...'];
          } else if (project.ecosystems.includes('python')) {
            cmd = 'python3';
            args = ['-m', 'py_compile'];
          } else {
            // Node / TypeScript project default
            cmd = 'npx';
            args = ['tsc', '--noEmit'];
          }
          break;
        }
      }
    }

    let rawOutput = '';
    try {
      const result = await execFilePromise(cmd, args, {
        cwd: targetPath,
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env, CI: '1', FORCE_COLOR: '0' }
      });
      rawOutput = (result.stdout || '') + '\n' + (result.stderr || '');
    } catch (execErr: any) {
      rawOutput = (execErr.stdout || '') + '\n' + (execErr.stderr || '');
      if (!rawOutput.trim() && execErr.message) {
        rawOutput = execErr.message;
      }
    }

    const parsed = parseDiagnostics(rawOutput, targetPath);
    return {
      success: true,
      tool,
      command: `${cmd} ${args.join(' ')}`,
      diagnostics: parsed.diagnostics,
      summary: parsed.summary,
      rawOutput: rawOutput.trim()
    };
  });
}
