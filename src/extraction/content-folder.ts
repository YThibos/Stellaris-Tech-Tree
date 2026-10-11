import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * A folder laid out like the game's own: the Stellaris install, or one mod.
 * Paths inside it are always written with forward slashes, whatever the operating system.
 */
export class ContentFolder {
  constructor(readonly root: string) {}

  async files(folder: string, extension: string): Promise<string[]> {
    const absolute = path.join(this.root, folder);
    if (!(await isDirectory(absolute))) return [];
    const entries = await readdir(absolute, { recursive: true });
    return entries
      .map((entry) => `${folder}/${entry.split(path.sep).join('/')}`)
      .filter((file) => file.toLowerCase().endsWith(extension))
      .sort();
  }

  async text(file: string): Promise<string> {
    const content = await readFile(path.join(this.root, file), 'utf8');
    return content.replace(/^\uFEFF/, '');
  }

  async bytes(file: string): Promise<Buffer> {
    return readFile(path.join(this.root, file));
  }

  async exists(file: string): Promise<boolean> {
    try {
      await stat(path.join(this.root, file));
      return true;
    } catch {
      return false;
    }
  }
}

async function isDirectory(folder: string): Promise<boolean> {
  try {
    return (await stat(folder)).isDirectory();
  } catch {
    return false;
  }
}
