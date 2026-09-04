import fs from 'fs/promises';
import path from 'path';
import type { ProjectInfo } from './types.js';

const MAX_CONFIG_READ_SIZE = 128 * 1024; // 128 KB max read limit for config files

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > MAX_CONFIG_READ_SIZE) return null;
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function detectProject(projectRoot: string): Promise<ProjectInfo> {
  const ecosystems: string[] = [];
  const configFiles: string[] = [];
  let name = path.basename(projectRoot);
  let packageManager: ProjectInfo['packageManager'] = null;
  let framework: string | null = null;
  const scripts: Record<string, string> = {};
  let devCommand: string | null = null;
  let buildCommand: string | null = null;
  let testCommand: string | null = null;
  let isMonorepo = false;
  let workspaces: string[] = [];

  // 1. Node.js / JavaScript / TypeScript detection
  const pkgContent = await safeReadFile(path.join(projectRoot, 'package.json'));
  if (pkgContent) {
    configFiles.push('package.json');
    ecosystems.push('Node.js');

    try {
      const parsed = JSON.parse(pkgContent);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        if (typeof parsed.name === 'string' && parsed.name.trim()) {
          name = parsed.name.trim().slice(0, 100);
        }

        // Scripts extraction (bounded & sanitized)
        if (typeof parsed.scripts === 'object' && parsed.scripts !== null) {
          const scriptKeys = Object.keys(parsed.scripts).slice(0, 50);
          for (const key of scriptKeys) {
            const val = parsed.scripts[key];
            if (typeof val === 'string') {
              scripts[key] = val.slice(0, 200);
            }
          }
        }

        // Dependencies & framework detection
        const allDeps = {
          ...(typeof parsed.dependencies === 'object' && parsed.dependencies ? parsed.dependencies : {}),
          ...(typeof parsed.devDependencies === 'object' && parsed.devDependencies ? parsed.devDependencies : {})
        };

        if ('typescript' in allDeps) {
          ecosystems.push('TypeScript');
        }

        if ('next' in allDeps) {
          framework = 'Next.js';
        } else if ('vite' in allDeps) {
          framework = 'Vite';
        } else if ('@nestjs/core' in allDeps) {
          framework = 'NestJS';
        } else if ('fastify' in allDeps) {
          framework = 'Fastify';
        } else if ('express' in allDeps) {
          framework = 'Express';
        } else if ('react' in allDeps) {
          framework = 'React';
        } else if ('vue' in allDeps) {
          framework = 'Vue';
        } else if ('svelte' in allDeps) {
          framework = 'Svelte';
        }

        if ('prisma' in allDeps || '@prisma/client' in allDeps) {
          ecosystems.push('Prisma');
        }

        // Monorepo workspaces
        if (Array.isArray(parsed.workspaces)) {
          isMonorepo = true;
          workspaces = parsed.workspaces.filter((w: unknown): w is string => typeof w === 'string').slice(0, 20);
        }
      }
    } catch {
      // Gracefully handle malformed package.json
    }

    // Secondary config file checks for TypeScript & frameworks
    if (await fileExists(path.join(projectRoot, 'tsconfig.json'))) {
      configFiles.push('tsconfig.json');
      if (!ecosystems.includes('TypeScript')) ecosystems.push('TypeScript');
    }
    if (await fileExists(path.join(projectRoot, 'vite.config.ts')) || await fileExists(path.join(projectRoot, 'vite.config.js'))) {
      configFiles.push('vite.config.*');
      if (!framework) framework = 'Vite';
    }
    if (await fileExists(path.join(projectRoot, 'next.config.js')) || await fileExists(path.join(projectRoot, 'next.config.mjs')) || await fileExists(path.join(projectRoot, 'next.config.ts'))) {
      configFiles.push('next.config.*');
      framework = 'Next.js';
    }
    if (await fileExists(path.join(projectRoot, 'pnpm-workspace.yaml'))) {
      configFiles.push('pnpm-workspace.yaml');
      isMonorepo = true;
    }

    // Deterministic Package Manager resolution
    if (await fileExists(path.join(projectRoot, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
      configFiles.push('pnpm-lock.yaml');
    } else if (await fileExists(path.join(projectRoot, 'yarn.lock'))) {
      packageManager = 'yarn';
      configFiles.push('yarn.lock');
    } else if (await fileExists(path.join(projectRoot, 'bun.lockb')) || await fileExists(path.join(projectRoot, 'bun.lock'))) {
      packageManager = 'bun';
      configFiles.push('bun.lock*');
    } else if (await fileExists(path.join(projectRoot, 'package-lock.json'))) {
      packageManager = 'npm';
      configFiles.push('package-lock.json');
    } else {
      packageManager = 'npm';
    }

    // Command mapping for Node
    const pmRun = packageManager === 'npm' ? 'npm run' : packageManager;
    if (scripts.dev) {
      devCommand = packageManager === 'yarn' ? 'yarn dev' : `${pmRun} dev`;
    } else if (scripts.start) {
      devCommand = packageManager === 'yarn' ? 'yarn start' : (packageManager === 'npm' ? 'npm start' : `${pmRun} start`);
    }

    if (scripts.build) {
      buildCommand = packageManager === 'yarn' ? 'yarn build' : `${pmRun} build`;
    }
    if (scripts.test) {
      testCommand = packageManager === 'yarn' ? 'yarn test' : (packageManager === 'npm' ? 'npm test' : `${pmRun} test`);
    }
  }

  // 2. PHP / Composer / Laravel detection
  const composerContent = await safeReadFile(path.join(projectRoot, 'composer.json'));
  if (composerContent) {
    configFiles.push('composer.json');
    if (!ecosystems.includes('PHP')) ecosystems.push('PHP');
    if (!packageManager) packageManager = 'composer';

    try {
      const parsed = JSON.parse(composerContent);
      if (typeof parsed === 'object' && parsed !== null) {
        if (typeof parsed.name === 'string' && (!name || name === path.basename(projectRoot))) {
          name = parsed.name;
        }
        const req = typeof parsed.require === 'object' && parsed.require ? parsed.require : {};
        if ('laravel/framework' in req || await fileExists(path.join(projectRoot, 'artisan'))) {
          framework = 'Laravel';
          if (!ecosystems.includes('Laravel')) ecosystems.push('Laravel');
          devCommand = 'php artisan serve';
          buildCommand = 'composer install --no-dev';
          testCommand = 'php artisan test';
        }
      }
    } catch {}

    if (await fileExists(path.join(projectRoot, 'artisan')) && !ecosystems.includes('Laravel')) {
      framework = 'Laravel';
      ecosystems.push('Laravel');
      devCommand = 'php artisan serve';
    }
  }

  // 3. Python detection
  const reqTxt = await safeReadFile(path.join(projectRoot, 'requirements.txt'));
  const pyProject = await safeReadFile(path.join(projectRoot, 'pyproject.toml'));
  const hasPipfile = await fileExists(path.join(projectRoot, 'Pipfile'));
  const hasManagePy = await fileExists(path.join(projectRoot, 'manage.py'));
  const hasMainPy = await fileExists(path.join(projectRoot, 'main.py')) || await fileExists(path.join(projectRoot, 'app.py'));

  if (reqTxt || pyProject || hasPipfile || hasManagePy || hasMainPy) {
    if (!ecosystems.includes('Python')) ecosystems.push('Python');
    if (reqTxt) configFiles.push('requirements.txt');
    if (pyProject) configFiles.push('pyproject.toml');

    if (!packageManager) {
      if (await fileExists(path.join(projectRoot, 'poetry.lock'))) {
        packageManager = 'poetry';
      } else {
        packageManager = 'pip';
      }
    }

    if (hasManagePy) {
      framework = 'Django';
      devCommand = 'python manage.py runserver';
      testCommand = 'python manage.py test';
    } else if (hasMainPy) {
      const entry = (await fileExists(path.join(projectRoot, 'app.py'))) ? 'app.py' : 'main.py';
      devCommand = `python ${entry}`;
    }

    if (await fileExists(path.join(projectRoot, 'pytest.ini')) || await dirExists(path.join(projectRoot, 'tests'))) {
      if (!testCommand) testCommand = 'pytest';
    }
  }

  // 4. Rust detection
  const cargoContent = await safeReadFile(path.join(projectRoot, 'Cargo.toml'));
  if (cargoContent) {
    configFiles.push('Cargo.toml');
    if (!ecosystems.includes('Rust')) ecosystems.push('Rust');
    if (!packageManager) packageManager = 'cargo';
    if (!devCommand) devCommand = 'cargo run';
    if (!buildCommand) buildCommand = 'cargo build';
    if (!testCommand) testCommand = 'cargo test';

    // Simple header extraction for name
    const match = cargoContent.match(/name\s*=\s*["']([^"']+)["']/);
    if (match && match[1] && (!name || name === path.basename(projectRoot))) {
      name = match[1];
    }
  }

  // 5. Go detection
  const goModContent = await safeReadFile(path.join(projectRoot, 'go.mod'));
  if (goModContent) {
    configFiles.push('go.mod');
    if (!ecosystems.includes('Go')) ecosystems.push('Go');
    if (!packageManager) packageManager = 'go';
    if (!devCommand) devCommand = 'go run .';
    if (!buildCommand) buildCommand = 'go build .';
    if (!testCommand) testCommand = 'go test ./...';

    const match = goModContent.match(/^module\s+([^\s]+)/m);
    if (match && match[1] && (!name || name === path.basename(projectRoot))) {
      name = match[1].split('/').pop() || name;
    }
  }

  const isProject = ecosystems.length > 0;

  return {
    root: projectRoot,
    name,
    isProject,
    ecosystems,
    packageManager,
    framework,
    scripts,
    devCommand,
    buildCommand,
    testCommand,
    configFiles,
    isMonorepo,
    workspaces: workspaces.length > 0 ? workspaces : undefined
  };
}
