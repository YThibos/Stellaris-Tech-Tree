import type { ContentFolder } from './content-folder.ts';

const LOCALISATION_FOLDER = 'localisation';
const ENTRY = /^\s*([\w.\-']+):\d*\s*"(.*)"/;
const MAX_REFERENCE_DEPTH = 8;

/**
 * The game's English text, keyed case-insensitively as the game does.
 * Later folders replace earlier ones, as a mod's localisation replaces the game's.
 */
export class Localisation {
  private constructor(private readonly entries: Map<string, string>) {}

  static async read(folders: ContentFolder[]): Promise<Localisation> {
    const entries = new Map<string, string>();
    for (const folder of folders) {
      for (const file of await englishFiles(folder)) {
        for (const [key, value] of parseEntries(await folder.text(file))) entries.set(key, value);
      }
    }
    return new Localisation(entries);
  }

  static of(entries: Record<string, string>): Localisation {
    return new Localisation(new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v])));
  }

  has(key: string): boolean {
    return this.entries.has(key.toLowerCase());
  }

  /** The plain text for a key, with references followed and colour and icon codes removed. */
  text(key: string): string | undefined {
    const raw = this.entries.get(key.toLowerCase());
    return raw === undefined ? undefined : plainText(this.followReferences(raw, 0));
  }

  private followReferences(text: string, depth: number): string {
    if (depth >= MAX_REFERENCE_DEPTH) return text;
    return text.replace(/\$([\w.-]+)(?:\|[^$]*)?\$/g, (reference, key: string) => {
      const target = this.entries.get(key.toLowerCase());
      return target === undefined ? reference : this.followReferences(target, depth + 1);
    });
  }
}

async function englishFiles(folder: ContentFolder): Promise<string[]> {
  const files = await folder.files(LOCALISATION_FOLDER, '.yml');
  const english = files.filter((file) => file.toLowerCase().endsWith('_l_english.yml'));
  const replacing = (file: string) => file.toLowerCase().includes('/replace/');
  return [...english.filter((file) => !replacing(file)), ...english.filter(replacing)];
}

function parseEntries(content: string): [string, string][] {
  return content.split(/\r?\n/).flatMap((line) => {
    const match = ENTRY.exec(line);
    if (!match) return [];
    const value = (match[2] ?? '').replace(/"\s*(#.*)?$/, '');
    return [[(match[1] ?? '').toLowerCase(), value]];
  });
}

function plainText(text: string): string {
  return text
    .replace(/\\n/g, ' ')
    .replace(/§[A-Za-z!]/g, '')
    .replace(/£[\w|]+£/g, '')
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
