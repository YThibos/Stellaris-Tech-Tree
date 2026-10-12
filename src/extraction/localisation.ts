import type { ContentFolder } from './content-folder.ts';

const LOCALISATION_FOLDER = 'localisation';
const ENTRY = /^\s*([\w.\-']+):\d*\s*"(.*)"/;
const MAX_REFERENCE_DEPTH = 8;

/** One folder's English text: its ordinary files, and those in `replace` folders that load last. */
export interface LocalisationEntries {
  ordinary: Map<string, string>;
  replacing: Map<string, string>;
}

export async function readLocalisationEntries(folder: ContentFolder): Promise<LocalisationEntries> {
  const entries: LocalisationEntries = { ordinary: new Map(), replacing: new Map() };
  for (const file of await englishFiles(folder)) {
    const target = isReplacing(file) ? entries.replacing : entries.ordinary;
    for (const [key, value] of parseEntries(await folder.text(file))) target.set(key, value);
  }
  return entries;
}

/**
 * The game's English text, keyed case-insensitively as the game does.
 * Later folders win, and every `replace` folder wins over every ordinary file, as in the game.
 */
export class Localisation {
  private constructor(private readonly entries: Map<string, string>) {}

  static combine(folders: LocalisationEntries[]): Localisation {
    const entries = new Map<string, string>();
    for (const { ordinary } of folders)
      for (const [key, value] of ordinary) entries.set(key, value);
    for (const { replacing } of folders)
      for (const [key, value] of replacing) entries.set(key, value);
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
  return files.filter((file) => file.toLowerCase().endsWith('_l_english.yml'));
}

function isReplacing(file: string): boolean {
  return file.toLowerCase().includes('/replace/');
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
