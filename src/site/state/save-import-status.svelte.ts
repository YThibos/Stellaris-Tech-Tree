import type { ContentSource } from '../../domain/snapshot.ts';
import type { TechnologyKey } from '../../domain/technology.ts';
import type { SaveReadingStage } from '../../save/save-research.ts';
import type { CampaignBook } from './campaign-book.svelte.ts';
import { importSave } from './save-import.ts';
import { newCampaignId } from './campaign-file.ts';

const STAGE_MESSAGES: Record<SaveReadingStage, string> = {
  unpacking: 'Unpacking the save…',
  reading: 'Reading your research…',
};

/**
 * Turns a dropped or chosen save into a campaign named after the empire, updating the campaign
 * of the same name when the save is a later one of a game already imported. The mods the save's
 * research comes from are switched on, so its techs are on the board.
 */
export class SaveImport {
  message = $state<string | null>(null);
  failed = $state(false);

  constructor(
    private readonly campaigns: CampaignBook,
    private readonly knownTechnology: (key: TechnologyKey) => boolean,
    private readonly switchOnModsDefining: (keys: TechnologyKey[]) => ContentSource[],
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
      const switchedOn = this.switchOnModsDefining(keys);
      this.message = this.summaryOf(campaign.name, research.date, keys, switchedOn.length);
    } catch (error) {
      this.failed = true;
      this.message = error instanceof Error ? error.message : String(error);
    }
  }

  private summaryOf(name: string, date: string, keys: string[], modsSwitchedOn: number): string {
    return `"${name}" (${date}): ${keys.length} researched techs imported.${modsNote(modsSwitchedOn)}${this.unknownNote(keys)}`;
  }

  private unknownNote(keys: string[]): string {
    const unknown = keys.filter((key) => !this.knownTechnology(key)).length;
    if (unknown === 0) return '';
    return ` ${unknown === 1 ? 'One is' : `${unknown} are`} not in this tree, probably from a mod it does not include.`;
  }
}

function modsNote(switchedOn: number): string {
  if (switchedOn === 0) return '';
  return switchedOn === 1
    ? ' Switched on the mod this save uses.'
    : ` Switched on the ${switchedOn} mods this save uses.`;
}
