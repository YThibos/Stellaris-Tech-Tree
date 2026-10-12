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
 * of the same name when the save is a later one of a game already imported.
 */
export class SaveImport {
  message = $state<string | null>(null);
  failed = $state(false);

  constructor(
    private readonly campaigns: CampaignBook,
    private readonly knownTechnology: (key: string) => boolean,
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
      this.message = this.summaryOf(campaign.name, research.date, Object.keys(research.researched));
    } catch (error) {
      this.failed = true;
      this.message = error instanceof Error ? error.message : String(error);
    }
  }

  private summaryOf(name: string, date: string, keys: string[]): string {
    const unknown = keys.filter((key) => !this.knownTechnology(key)).length;
    const unknownNote =
      unknown === 0
        ? ''
        : ` ${unknown === 1 ? 'One is' : `${unknown} are`} not in this tree, probably from a mod that is off or missing.`;
    return `"${name}" (${date}): ${keys.length} researched techs imported.${unknownNote}`;
  }
}
