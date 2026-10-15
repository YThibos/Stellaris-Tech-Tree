import type { ScriptBlock } from '../script/script-node.ts';
import { parseScript } from '../script/script-parser.ts';
import type { ContentFolder } from './content-folder.ts';
import { DlcChecks } from './dlc-checks.ts';
import { InlineScripts, readInlineTemplates } from './inline-scripts.ts';
import { Localisation, readLocalisationEntries, type LocalisationEntries } from './localisation.ts';
import { ScriptedVariables } from './scripted-variables.ts';

const VARIABLE_FOLDER = 'common/scripted_variables';
const TRIGGER_FOLDER = 'common/scripted_triggers';

/** What a layer's definitions are read against: everything loaded up to and including its source. */
export interface ReadingContext {
  variables: ScriptedVariables;
  inlineScripts: InlineScripts;
  localisation: Localisation;
  dlcChecks: DlcChecks;
}

interface FolderContent {
  variables: ScriptBlock[];
  triggers: ScriptBlock[];
  inlineTemplates: Map<string, string>;
  localisation: LocalisationEntries;
}

/**
 * Reads each folder's shared files once, however many layers need them, so extracting twenty
 * mods does not reread the base game twenty times.
 */
export class ContentLibrary {
  private readonly contents = new Map<ContentFolder, Promise<FolderContent>>();

  async contextFor(folders: ContentFolder[]): Promise<ReadingContext> {
    const contents = await Promise.all(folders.map((folder) => this.contentOf(folder)));
    const variables = new ScriptedVariables();
    for (const block of contents.flatMap((content) => content.variables))
      variables.learnFrom(block);
    const dlcChecks = new DlcChecks();
    for (const block of contents.flatMap((content) => content.triggers)) dlcChecks.learnFrom(block);
    return {
      dlcChecks,
      variables,
      inlineScripts: InlineScripts.combine(contents.map((content) => content.inlineTemplates)),
      localisation: Localisation.combine(contents.map((content) => content.localisation)),
    };
  }

  private contentOf(folder: ContentFolder): Promise<FolderContent> {
    let content = this.contents.get(folder);
    if (!content) {
      content = readFolderContent(folder);
      this.contents.set(folder, content);
    }
    return content;
  }
}

async function readFolderContent(folder: ContentFolder): Promise<FolderContent> {
  return {
    variables: await parseAll(folder, VARIABLE_FOLDER),
    triggers: await parseAll(folder, TRIGGER_FOLDER),
    inlineTemplates: await readInlineTemplates(folder),
    localisation: await readLocalisationEntries(folder),
  };
}

async function parseAll(folder: ContentFolder, subfolder: string): Promise<ScriptBlock[]> {
  const files = await folder.files(subfolder, '.txt');
  return Promise.all(files.map(async (file) => parseScript(await folder.text(file))));
}
