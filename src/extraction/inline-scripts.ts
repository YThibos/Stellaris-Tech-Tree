import { isBlock, textOf, type ScriptBlock, type ScriptEntry } from '../script/script-node.ts';
import { parseScript } from '../script/script-parser.ts';
import type { ContentFolder } from './content-folder.ts';

const INLINE_SCRIPT_FOLDER = 'common/inline_scripts';
const MAX_NESTING = 10;

/**
 * The game's `inline_script` templates. Expanding one pastes the template in place, with its
 * `$PARAMETER$` placeholders and `[[PARAMETER] ... ]` optional sections filled in.
 */
export class InlineScripts {
  readonly missing = new Set<string>();

  private constructor(private readonly templates: Map<string, string>) {}

  /** Later folders' templates replace earlier ones of the same name. */
  static combine(folders: Map<string, string>[]): InlineScripts {
    return new InlineScripts(new Map(folders.flatMap((templates) => [...templates])));
  }

  expand(block: ScriptBlock, depth = 0): ScriptBlock {
    return { ...block, entries: block.entries.flatMap((entry) => this.expandEntry(entry, depth)) };
  }

  private expandEntry(entry: ScriptEntry, depth: number): ScriptEntry[] {
    if (entry.key === 'inline_script' && depth < MAX_NESTING) return this.paste(entry, depth);
    if (isBlock(entry.value)) return [{ ...entry, value: this.expand(entry.value, depth) }];
    return [entry];
  }

  private paste(entry: ScriptEntry, depth: number): ScriptEntry[] {
    const call = invocationOf(entry);
    const template = this.templates.get(call.script);
    if (template === undefined) {
      this.missing.add(call.script);
      return [];
    }
    const filled = fillParameters(template, call.parameters);
    return this.expand(parseScript(filled), depth + 1).entries;
  }
}

export async function readInlineTemplates(folder: ContentFolder): Promise<Map<string, string>> {
  const templates = new Map<string, string>();
  for (const file of await folder.files(INLINE_SCRIPT_FOLDER, '.txt')) {
    const name = file.slice(INLINE_SCRIPT_FOLDER.length + 1, -'.txt'.length);
    templates.set(name, await folder.text(file));
  }
  return templates;
}

interface Invocation {
  script: string;
  parameters: Map<string, string>;
}

function invocationOf(entry: ScriptEntry): Invocation {
  if (!isBlock(entry.value)) return { script: entry.value, parameters: new Map() };
  const parameters = new Map(
    entry.value.entries
      .filter((parameter) => parameter.key && parameter.key !== 'script')
      .map((parameter) => [parameter.key ?? '', String(parameter.value)]),
  );
  return { script: textOf(entry.value, 'script') ?? '', parameters };
}

function fillParameters(template: string, parameters: Map<string, string>): string {
  return template
    .replace(/\[\[(!?)(\w+)\]([\s\S]*?)\]/g, (_, negated: string, name: string, body: string) =>
      parameters.has(name) !== (negated === '!') ? body : '',
    )
    .replace(
      /\$(\w+)(?:\|([^$]*))?\$/g,
      (_, name: string, fallback: string | undefined) => parameters.get(name) ?? fallback ?? '',
    );
}
