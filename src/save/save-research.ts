import { blockOf, isBlock, textOf, type ScriptBlock } from '../script/script-node.ts';
import { parseScript } from '../script/script-parser.ts';
import { readZipEntry } from './zip-reader.ts';

/** What a save says about the player's research. */
export interface SaveResearch {
  empireName: string;
  date: string;
  /** Each researched tech with its level; 1 for techs researched once. */
  researched: Record<string, number>;
}

export type SaveReadingStage = 'unpacking' | 'reading';

/**
 * Reads the player's researched techs from a Stellaris save. A late-game save holds hundreds of
 * megabytes of text, so only the few blocks that matter are found and parsed.
 */
export async function readSaveResearch(
  save: Uint8Array,
  onStage: (stage: SaveReadingStage) => void = () => undefined,
): Promise<SaveResearch> {
  onStage('unpacking');
  const meta = parseScript(new TextDecoder().decode(await readZipEntry(save, 'meta')));
  const gamestate = new TextDecoder().decode(await readZipEntry(save, 'gamestate'));
  onStage('reading');
  const country = playerCountryId(gamestate);
  return {
    empireName: textOf(meta, 'name') ?? 'Imported campaign',
    date: textOf(meta, 'date') ?? '',
    researched: researchedTechs(techStatusOf(gamestate, country)),
  };
}

function playerCountryId(gamestate: string): string {
  const players = topLevelBlock(gamestate, 'player');
  const firstPlayer = players.entries.find((entry) => isBlock(entry.value))?.value;
  const country = isBlock(firstPlayer) ? textOf(firstPlayer, 'country') : undefined;
  if (country === undefined) throw unreadable('it names no player empire');
  return country;
}

/**
 * Saves open every block on the line after its key (`tech_status=` then `{`), with tabs showing
 * the depth, so each step matches `key=`, any whitespace, then the brace.
 */
function techStatusOf(gamestate: string, country: string): ScriptBlock {
  const countries = indexAfter(gamestate, /\ncountry=\s*\{/g, 0);
  if (countries === -1) throw unreadable('it has no empires');
  const start = indexAfter(gamestate, new RegExp(`\\n\\t${country}=\\s*\\{`, 'g'), countries);
  if (start === -1) throw unreadable('the player empire is missing');
  const nextCountry = indexAfter(gamestate, /\n\t\d+=\s*\{/g, start + 1);
  const end = nextCountry === -1 ? gamestate.length : nextCountry;
  const techStatus = indexAfter(gamestate, /\n\t\ttech_status=\s*\{/g, start);
  if (techStatus === -1 || techStatus > end) throw unreadable('the player empire has no research');
  return blockFrom(gamestate, gamestate.indexOf('{', techStatus));
}

/** Where `pattern` (which must be global) next matches at or after `from`, or -1. */
function indexAfter(text: string, pattern: RegExp, from: number): number {
  pattern.lastIndex = from;
  return pattern.exec(text)?.index ?? -1;
}

/**
 * Researched techs sit at the top of `tech_status` as `technology="tech_x"` followed by its
 * `level`. Queues and research options deeper inside also name techs, and are left alone.
 */
function researchedTechs(techStatus: ScriptBlock): Record<string, number> {
  const researched: Record<string, number> = {};
  let current: string | undefined;
  for (const entry of techStatus.entries) {
    if (entry.key === 'technology' && typeof entry.value === 'string') {
      current = entry.value;
      researched[current] = 1;
    } else if (entry.key === 'level' && current && typeof entry.value === 'string') {
      researched[current] = Math.max(1, Number(entry.value) || 1);
    }
  }
  return researched;
}

function topLevelBlock(gamestate: string, key: string): ScriptBlock {
  const start = indexAfter(gamestate, new RegExp(`(^|\\n)${key}=\\s*\\{`, 'g'), 0);
  if (start === -1) throw unreadable(`it has no ${key} section`);
  return blockFrom(gamestate, gamestate.indexOf('{', start));
}

/** Parses the block that opens at `open`, finding its end by counting braces outside quotes. */
function blockFrom(text: string, open: number): ScriptBlock {
  let depth = 0;
  let quoted = false;
  for (let index = open; index < text.length; index++) {
    const character = text[index];
    if (character === '"' && text[index - 1] !== '\\') quoted = !quoted;
    if (quoted) continue;
    if (character === '{') depth++;
    if (character === '}' && --depth === 0) {
      return (
        blockOf(parseScript(`block=${text.slice(open, index + 1)}`), 'block') ?? {
          entries: [],
          tag: null,
        }
      );
    }
  }
  throw unreadable('a section never closes');
}

function unreadable(reason: string): Error {
  return new Error(
    `This save could not be read because ${reason}. Ironman saves and saves from very old versions may not be readable.`,
  );
}
