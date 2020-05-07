import { exec } from 'child_process';
import { Uri, workspace } from 'coc.nvim';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import which from 'which';

const execPromise = promisify(exec);

export interface DenoVersion {
  deno: string;
  v8: string;
  typescript: string;
  raw: string;
}

function denoBin(): string | undefined {
  const bin = process.platform === 'win32' ? 'deno.exe' : 'deno';
  if (!which.sync(bin, { nothrow: true })) {
    return;
  }

  return bin;
}

export async function getVersion(): Promise<DenoVersion | undefined> {
  const bin = denoBin();
  if (!bin) {
    return;
  }

  try {
    const { stdout, stderr } = await execPromise(`${bin} eval "console.log(JSON.stringify(Deno.version))"`);
    if (stderr) {
      return;
    }

    const { deno, v8, typescript } = JSON.parse(stdout);

    return {
      deno,
      v8,
      typescript,
      raw: `deno: ${deno}\nv8: ${v8}\ntypescript: ${typescript}`,
    };
  } catch {
    return;
  }
}

export async function denoCache(): Promise<void> {
  const doc = await workspace.document;
  if (!doc) {
    return;
  }
  const bin = denoBin();
  if (!bin) {
    return;
  }

  try {
    const _uri = Uri.parse(doc.uri).fsPath;
    await execPromise(`${bin} cache ${_uri}`);

    await workspace.nvim.command('edit');
  } catch {}
}

function getDenoDir(): string {
  // ref https://deno.land/manual.html
  // On Linux/Redox: $XDG_CACHE_HOME/deno or $HOME/.cache/deno
  // On Windows: %LOCALAPPDATA%/deno (%LOCALAPPDATA% = FOLDERID_LocalAppData)
  // On macOS: $HOME/Library/Caches/deno
  // If something fails, it falls back to $HOME/.deno
  let denoDir = process.env.DENO_DIR;
  if (!denoDir) {
    switch (process.platform) {
      case 'win32':
        denoDir = `${process.env.LOCALAPPDATA}\\deno`;
        break;
      case 'darwin':
        denoDir = `${process.env.HOME}/Library/Caches/deno`;
        break;
      case 'linux':
        denoDir = `${process.env.HOME}/.cache/deno`;
        break;
      default:
        denoDir = `${process.env.HOME}/.deno`;
    }
  }

  return denoDir;
}

export async function denoTypes(): Promise<void> {
  const bin = denoBin();
  if (!bin) {
    return;
  }

  const denoDir = getDenoDir();
  if (!fs.existsSync(denoDir)) {
    fs.mkdirSync(denoDir, { recursive: true });
  }

  try {
    const { stdout, stderr } = await execPromise(`${bin} types`);
    if (stderr) {
      return;
    }

    fs.writeFileSync(path.resolve(denoDir, 'lib.deno_runtime.d.ts'), stdout);
  } catch {}
}
