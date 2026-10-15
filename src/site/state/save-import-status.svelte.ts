import type { TechnologyKey } from '../../domain/technology.ts';
import type { SaveReadingStage } from '../../save/save-research.ts';
import type { CampaignBook } from './campaign-book.svelte.ts';
import { importSave } from './save-import.ts';
import { newCampaignId } from './campaign-file.ts';
import type { GameMatch, GameSetup } from './tree-view.svelte.ts';

const STAGE_MESSAGES: Record<SaveReadingStage, string> = {
  unpacking: 'Unpacking the save…',
  reading: 'Reading your research…',
};

/**
 * Turns a dropped or chosen save into a campaign named after the empire, updating the campaign
 * of the same name when the save is a later one of a game already imported. The tree's mods and
 * DLCs are set to the game's, so its techs are on the board as the player knows them.
 */
export class SaveImport {
  message = $state<string | null>(null);
  failed = $state(false);

  constructor(
    private readonly campaigns: CampaignBook,
    private readonly knownTechnology: (key: TechnologyKey) => boolean,
    private readonly matchGame: (game: GameSetup) => GameMatch,
  ) {}

  async start(file: File): Promise<void> {
    this.failed = false;
    try {
      const research = await importSave(file, (stage) => (this.message = STAGE_MESSAGES[stage]));
      const campaign = this.campaigns.adopt({
        id: newCampaignId(),
        name: research.empireName,
        researched: research.researched,
      });
      const keys = Object.keys(research.researched);
      const match = this.matchGame({ researched: keys, mods: research.mods, dlcs: research.dlcs });
      this.message = this.summaryOf(campaign.name, research.date, keys, match);
    } catch (error) {
      this.failed = true;
      this.message = error instanceof Error ? error.message : String(error);
    }
  }

  private summaryOf(name: string, date: string, keys: string[], match: GameMatch): string {
    return `"${name}" (${date}): ${keys.length} researched techs imported.${matchNote(match)}${this.unknownNote(keys)}`;
  }

  private unknownNote(keys: string[]): string {
    const unknown = keys.filter((key) => !this.knownTechnology(key)).length;
    if (unknown === 0) return '';
    return ` ${unknown === 1 ? 'One is' : `${unknown} are`} not in this tree, probably from a mod it does not include.`;
  }
}

function matchNote({ modsOn, dlcsLeftOut }: GameMatch): string {
  const mods = modsOn === 0 ? 'no mods' : `${modsOn} ${modsOn === 1 ? 'mod' : 'mods'} on`;
  const dlcs =
    dlcsLeftOut === 0
      ? ''
      : `, without the ${dlcsLeftOut} ${dlcsLeftOut === 1 ? 'DLC' : 'DLCs'} it lacks`;
  return ` The tree now matches that game: ${mods}${dlcs}.`;
}
