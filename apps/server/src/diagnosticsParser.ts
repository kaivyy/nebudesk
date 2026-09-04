import path from 'path';

export interface DiagnosticItem {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string | undefined;
  source?: string | undefined;
}

export interface DiagnosticsResult {
  diagnostics: DiagnosticItem[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    total: number;
  };
}

/**
 * Normalizes relative or absolute file paths relative to a workspace root.
 */
export function normalizeDiagnosticPath(filePath: string, workspace?: string): string {
  let cleaned = filePath.trim().replace(/\\/g, '/');

  if (workspace) {
    const normWs = workspace.trim().replace(/\\/g, '/').replace(/\/+$/, '');
    if (cleaned.startsWith(normWs)) {
      cleaned = cleaned.slice(normWs.length);
    }
  }
  return cleaned.replace(/^[\./\\]+/, '');
}

/**
 * Parses raw compiler, linter, or build tool output into structured diagnostics.
 */
export function parseDiagnostics(rawOutput: string, workspace?: string): DiagnosticsResult {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return { diagnostics: [], summary: { errors: 0, warnings: 0, infos: 0, total: 0 } };
  }

  const lines = rawOutput.split(/\r?\n/);
  const items: DiagnosticItem[] = [];
  const seen = new Set<string>();

  let currentRustError: { code?: string | undefined; message: string; severity: 'error' | 'warning' } | null = null;
  let currentPythonTracebackFile: { file: string; line: number } | null = null;
  let currentEslintFile: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] || '';
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Rust multi-line format:
    // Line 1: error[E0425]: cannot find value `x` in this scope
    // Line 2:   --> src/main.rs:14:5
    const rustHeadMatch = line.match(/^(error|warning)\[([A-Z0-9]+)\]:\s+(.*)$/);
    if (rustHeadMatch) {
      currentRustError = {
        severity: rustHeadMatch[1] === 'warning' ? 'warning' : 'error',
        code: rustHeadMatch[2],
        message: rustHeadMatch[3] || '',
      };
      continue;
    }

    if (currentRustError) {
      const rustLocMatch = line.match(/^-->\s+([^:\s]+):(\d+):(\d+)/);
      if (rustLocMatch) {
        const file = normalizeDiagnosticPath(rustLocMatch[1] || '', workspace);
        const lineNum = parseInt(rustLocMatch[2] || '1', 10);
        const colNum = parseInt(rustLocMatch[3] || '1', 10);
        const diagId = `${file}:${lineNum}:${colNum}:${currentRustError.code || ''}:${currentRustError.message}`;

        if (!seen.has(diagId)) {
          seen.add(diagId);
          items.push({
            id: diagId,
            file,
            line: lineNum,
            column: colNum,
            severity: currentRustError.severity,
            message: currentRustError.message,
            code: currentRustError.code,
            source: 'rustc'
          });
        }
        currentRustError = null;
        continue;
      }
    }

    // 2. Python Traceback format:
    // Line 1:   File "app/main.py", line 42, in <module>
    // Line 2:     x = 1 / 0
    // Line 3: ZeroDivisionError: division by zero
    const pyFileMatch = line.match(/^File\s+["']([^"']+)["'],\s+line\s+(\d+)/);
    if (pyFileMatch) {
      currentPythonTracebackFile = {
        file: normalizeDiagnosticPath(pyFileMatch[1] || '', workspace),
        line: parseInt(pyFileMatch[2] || '1', 10)
      };
      continue;
    }

    if (currentPythonTracebackFile && /^[A-Z][a-zA-Z0-9_]*(?:Error|Exception|Warning):\s+(.*)$/.test(line)) {
      const errType = line.split(':')[0] || 'PythonError';
      const errMsg = line.slice(errType.length + 1).trim();
      const isWarn = errType.toLowerCase().includes('warning');
      const diagId = `${currentPythonTracebackFile.file}:${currentPythonTracebackFile.line}:1:${errType}:${errMsg}`;

      if (!seen.has(diagId)) {
        seen.add(diagId);
        items.push({
          id: diagId,
          file: currentPythonTracebackFile.file,
          line: currentPythonTracebackFile.line,
          column: 1,
          severity: isWarn ? 'warning' : 'error',
          message: `${errType}: ${errMsg}`,
          code: errType,
          source: 'python'
        });
      }
      currentPythonTracebackFile = null;
      continue;
    }

    // 3. ESLint tabular output:
    // /path/to/file.ts
    //   14:5  error  Unexpected console statement  no-console
    if (line.startsWith('/') || line.endsWith('.ts') || line.endsWith('.tsx') || line.endsWith('.js') || line.endsWith('.jsx')) {
      if (!line.includes(':') && !line.includes(' ')) {
        currentEslintFile = normalizeDiagnosticPath(line, workspace);
        continue;
      }
    }

    if (currentEslintFile) {
      const eslintTabMatch = line.match(/^(\d+):(\d+)\s+(error|warning)\s+(.*?)(?:\s{2,}([a-zA-Z0-9_\-\/]+))?$/);
      if (eslintTabMatch) {
        const lineNum = parseInt(eslintTabMatch[1] || '1', 10);
        const colNum = parseInt(eslintTabMatch[2] || '1', 10);
        const sev = eslintTabMatch[3] === 'warning' ? 'warning' : 'error';
        const msg = eslintTabMatch[4] || '';
        const code = eslintTabMatch[5] || undefined;
        const diagId = `${currentEslintFile}:${lineNum}:${colNum}:${code || ''}:${msg}`;

        if (!seen.has(diagId)) {
          seen.add(diagId);
          items.push({
            id: diagId,
            file: currentEslintFile,
            line: lineNum,
            column: colNum,
            severity: sev,
            message: msg,
            code,
            source: 'eslint'
          });
        }
        continue;
      }
    }

    // 4. TypeScript parenthesized format:
    // src/app.ts(42,15): error TS2304: Cannot find name 'foo'.
    const tsParenMatch = line.match(/^([^(]+)\((\d+),(\d+)\):\s+(error|warning|info)\s+([A-Z0-9]+):\s+(.*)$/);
    if (tsParenMatch) {
      const file = normalizeDiagnosticPath(tsParenMatch[1] || '', workspace);
      const lineNum = parseInt(tsParenMatch[2] || '1', 10);
      const colNum = parseInt(tsParenMatch[3] || '1', 10);
      const sev = tsParenMatch[4] as 'error' | 'warning' | 'info';
      const code = tsParenMatch[5];
      const msg = tsParenMatch[6] || '';
      const diagId = `${file}:${lineNum}:${colNum}:${code}:${msg}`;

      if (!seen.has(diagId)) {
        seen.add(diagId);
        items.push({
          id: diagId,
          file,
          line: lineNum,
          column: colNum,
          severity: sev,
          message: msg,
          code,
          source: 'tsc'
        });
      }
      continue;
    }

    // 5. TypeScript colon-dash format:
    // src/app.ts:42:15 - error TS2304: Cannot find name 'foo'.
    const tsColonMatch = line.match(/^([^:]+):(\d+):(\d+)\s+-\s+(error|warning|info)\s+([A-Z0-9]+):\s+(.*)$/);
    if (tsColonMatch) {
      const file = normalizeDiagnosticPath(tsColonMatch[1] || '', workspace);
      const lineNum = parseInt(tsColonMatch[2] || '1', 10);
      const colNum = parseInt(tsColonMatch[3] || '1', 10);
      const sev = tsColonMatch[4] as 'error' | 'warning' | 'info';
      const code = tsColonMatch[5];
      const msg = tsColonMatch[6] || '';
      const diagId = `${file}:${lineNum}:${colNum}:${code}:${msg}`;

      if (!seen.has(diagId)) {
        seen.add(diagId);
        items.push({
          id: diagId,
          file,
          line: lineNum,
          column: colNum,
          severity: sev,
          message: msg,
          code,
          source: 'tsc'
        });
      }
      continue;
    }

    // 6. ESLint / Vite / Rollup inline format:
    // src/App.tsx:25:10: error: 'x' is defined but never used. [eslint/no-unused-vars]
    const eslintInlineMatch = line.match(/^([^:\n]+):(\d+):(\d+):\s+(error|warning|info):\s+(.*?)(?:\s+\[([^\]]+)\])?$/);
    if (eslintInlineMatch) {
      const file = normalizeDiagnosticPath(eslintInlineMatch[1] || '', workspace);
      const lineNum = parseInt(eslintInlineMatch[2] || '1', 10);
      const colNum = parseInt(eslintInlineMatch[3] || '1', 10);
      const sev = eslintInlineMatch[4] as 'error' | 'warning' | 'info';
      const msg = eslintInlineMatch[5] || '';
      const code = eslintInlineMatch[6];
      const diagId = `${file}:${lineNum}:${colNum}:${code || ''}:${msg}`;

      if (!seen.has(diagId)) {
        seen.add(diagId);
        items.push({
          id: diagId,
          file,
          line: lineNum,
          column: colNum,
          severity: sev,
          message: msg,
          code,
          source: code?.includes('eslint') ? 'eslint' : 'linter'
        });
      }
      continue;
    }

    // 7. Flake8 / Python linter format:
    // src/main.py:10:5: F401 'os' imported but unused
    // src/main.py:12:1: E302 expected 2 blank lines
    const flake8Match = line.match(/^([^:\n]+):(\d+):(\d+):\s+([A-Z]\d+)\s+(.*)$/);
    if (flake8Match) {
      const file = normalizeDiagnosticPath(flake8Match[1] || '', workspace);
      const lineNum = parseInt(flake8Match[2] || '1', 10);
      const colNum = parseInt(flake8Match[3] || '1', 10);
      const code = flake8Match[4];
      const msg = flake8Match[5] || '';
      const diagId = `${file}:${lineNum}:${colNum}:${code}:${msg}`;

      if (!seen.has(diagId)) {
        seen.add(diagId);
        items.push({
          id: diagId,
          file,
          line: lineNum,
          column: colNum,
          severity: code && (code.startsWith('E') || code.startsWith('F')) ? 'error' : 'warning',
          message: msg,
          code,
          source: 'flake8'
        });
      }
      continue;
    }

    // 8. Go / Generic compiler format:
    // main.go:15:2: undefined: fmt.Printlnn
    // main.go:20:10: syntax error: unexpected semicolon
    const goMatch = line.match(/^([^:\n]+):(\d+):(\d+):\s+(.*)$/);
    if (goMatch) {
      const file = normalizeDiagnosticPath(goMatch[1] || '', workspace);
      // Skip if file looks like a log timestamp or protocol e.g. "http://localhost"
      if (file.includes('://') || file.includes(' ') || file.length < 3) continue;

      const lineNum = parseInt(goMatch[2] || '1', 10);
      const colNum = parseInt(goMatch[3] || '1', 10);
      const rest = goMatch[4] || '';
      const isWarning = rest.toLowerCase().includes('warning');
      const diagId = `${file}:${lineNum}:${colNum}::${rest}`;

      if (!seen.has(diagId)) {
        seen.add(diagId);
        items.push({
          id: diagId,
          file,
          line: lineNum,
          column: colNum,
          severity: isWarning ? 'warning' : 'error',
          message: rest,
          source: file.endsWith('.go') ? 'go' : 'compiler'
        });
      }
      continue;
    }
  }

  const errors = items.filter(i => i.severity === 'error').length;
  const warnings = items.filter(i => i.severity === 'warning').length;
  const infos = items.filter(i => i.severity === 'info').length;

  return {
    diagnostics: items,
    summary: {
      errors,
      warnings,
      infos,
      total: items.length
    }
  };
}
